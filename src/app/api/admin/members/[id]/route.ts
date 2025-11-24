import { db } from "@/src/lib/firebase/firebaseAdminConfig";
import { getDocumentById } from "@/src/lib/firebase/firestore";
import { verifyIdToken } from "@/src/lib/firebase/verifyIdToken";
import { ActivityLog, AppUser } from "@/src/models/user";
import { MemberRole } from "@/src/types/permissions";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = (await params).id;
    if (!userId) {
      return new Response(JSON.stringify({ data: "Error" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const user = (await getDocumentById("users", userId)) as AppUser;
    if (!user) {
      return new Response(JSON.stringify({ data: "Error" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const logsRef = db
      .collection("users")
      .doc(userId)
      .collection("activityLog");

    const snapshot = await logsRef.orderBy("timestamp", "desc").get();

    const logs = snapshot.docs.map((doc) => doc.data()) as ActivityLog[];

    const member = {
      ...user,
      dashboard: {
        ...user.dashboard,
        activityLog: logs,
      },
    };

    return new Response(JSON.stringify(member), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ data: "Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") || "";

    const decodedToken = await verifyIdToken(authHeader);

    if (!decodedToken || !decodedToken.admin) {
      return new Response(JSON.stringify({ data: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { id, data } = body;

    await db.collection("users").doc(id).update(data);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
