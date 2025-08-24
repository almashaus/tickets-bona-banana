import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

/*
  [ 1 ]
  Triggered when a user is deleted
*/
export const deleteUserDoc = functions.auth.user().onDelete(async (user) => {
  const { uid } = user;

  try {
    await db.collection("users").doc(uid).delete();
  } catch (error) {
    console.error(`Error deleting user`);
  }
});

/*
  [ 2 ]
  Triggered when change a user to admin 
*/
export const onMemberAdded = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    if (!change) {
      return;
    }
    try {
      const before = change.before.data();
      const after = change.after.data();

      // if hasDashboardAccess changes to true only
      if (
        before.hasDashboardAccess !== true &&
        after.hasDashboardAccess === true
      ) {
        const dashboard = {
          dashboard: {
            role: "Support",
            status: "Active",
            joinedDate: new Date().toISOString(),
            eventsManaged: 0,
          },
        };

        // update the user document with dashboard data
        await db.collection("users").doc(after.id).update(dashboard);

        // add admin custom claims
        const customClaims = {
          admin: true,
        };

        await auth.setCustomUserClaims(after.id, customClaims);
      }
    } catch (error) {
      console.error(`Error creating dashboard for admin user`, error);
    }
  });

/*
  [ 3 ]
  Scheduled function: Change event status from "published" to "completed" if its date has passed
*/
export const completePastEvents = functions.pubsub
  .schedule("every day 00:00") // runs at UTC midnight
  .onRun(async (context) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // normalize to UTC midnight

    const eventsSnap = await db
      .collection("events")
      .where("status", "==", "published")
      .get();

    const commits: Promise<FirebaseFirestore.WriteResult[]>[] = [];
    let batch = db.batch();
    let count = 0;

    eventsSnap.forEach((doc) => {
      const event = doc.data();
      const dates = event.dates || [];

      // Find the latest event date without sorting (more efficient than .sort)
      const latestDateObj = dates.reduce((latest: Date | null, d: any) => {
        let dateVal = d.date?.toDate?.() ?? d.date;
        if (dateVal instanceof admin.firestore.Timestamp) {
          dateVal = dateVal.toDate();
        }
        const current = dateVal instanceof Date ? dateVal : new Date(dateVal);
        return !latest || current > latest ? current : latest;
      }, null);

      if (latestDateObj) {
        const latestDate = new Date(latestDateObj);
        latestDate.setUTCHours(0, 0, 0, 0); // compare only by day (UTC)

        if (latestDate < today) {
          batch.update(doc.ref, { status: "completed" });
          count++;

          // Firestore limit: 500 writes per batch
          if (count === 500) {
            commits.push(batch.commit());
            batch = db.batch();
            count = 0;
          }
        }
      }
    });

    // Commit remaining writes
    if (count > 0) {
      commits.push(batch.commit());
    }

    if (commits.length > 0) {
      await Promise.all(commits);
    }

    return null;
  });

/*
  [ 4 ]
  Callable function to verfiy ID token
*/
export const verifyIdToken = functions.https.onCall(async (data, context) => {
  const idToken = data.idToken;
  if (!idToken) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "ID token is required."
    );
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (!decodedToken) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Invalid ID token."
      );
    }
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      claims: decodedToken,
    };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/*
  [ 5 ]
  Triggered when a new event is added; increments eventsManaged for the creator
*/
export const onEventCreated = functions.firestore
  .document("events/{eventId}")
  .onCreate(async (snap, context) => {
    const eventData = snap.data();
    const creatorId = eventData?.creatorId;
    if (!creatorId) {
      return;
    }
    try {
      // Increment dashboard.eventsManaged by 1 for the user
      await db
        .collection("users")
        .doc(creatorId)
        .update({
          "dashboard.eventsManaged": admin.firestore.FieldValue.increment(1),
        });
    } catch (error) {
      console.error(
        `Error incrementing eventsManaged for user ${creatorId}:`,
        error
      );
    }
  });

/*
  [ 6 ]
  Triggered when a new ticket is added; decrements availableTickets for the event date
*/
export const onTicketCreated = functions.firestore
  .document("tickets/{ticketId}")
  .onCreate(async (snap, context) => {
    const ticket = snap.data();
    const { eventId, eventDateId } = ticket || {};
    if (!eventId || !eventDateId) {
      return;
    }
    try {
      const eventRef = db.collection("events").doc(eventId);
      await db.runTransaction(async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists) return;

        const eventData = eventDoc.data();
        const dates = eventData?.dates || [];
        const updatedDates = dates.map((date: any) => {
          if (date.id === eventDateId) {
            const currentAvailable = date.availableTickets || 0;
            return {
              ...date,
              availableTickets: currentAvailable > 0 ? currentAvailable - 1 : 0,
            };
          }
          return date;
        });

        transaction.update(eventRef, { dates: updatedDates });
      });
    } catch (error) {
      console.error(
        `Error decrementing availableTickets for event ${eventId}, date ${eventDateId}:`,
        error
      );
    }
  });

const formatDate = (d: Date): string => d.toISOString().split("T")[0];
/*
  [ 7 ]
  Triggered when a new event is added or updated; add eventsDates
*/
export const updateEventDates = functions.firestore
  .document("events/{eventId}")
  .onWrite(async (change, context) => {
    const eventData = change.after.exists ? change.after.data() : null;
    if (!eventData) return null; // Document deleted

    const dates = eventData.dates || [];

    const eventDates = dates.map((d: any) => {
      const date = d.date?.toDate?.() ?? new Date(d.date);
      return formatDate(date);
    });

    return change.after.ref.update({ eventDates });
  });

/*
Deploy the functions command:
`firebase deploy --only functions`
*/
