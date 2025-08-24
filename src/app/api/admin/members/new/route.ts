import { auth, db, storage } from "@/src/lib/firebase/firebaseAdminConfig";
import { verifyIdToken } from "@/src/lib/firebase/verifyIdToken";
import { getFileName } from "@/src/lib/utils/utils";
import { AppUser } from "@/src/models/user";
import { NextRequest } from "next/server";

async function renameFile(oldPath: string, newPath: string) {
  const bucket = storage.bucket();
  const file = bucket.file(oldPath);
  await file.copy(bucket.file(newPath));
  await file.delete();
}

export async function POST(req: NextRequest) {
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
    const { email, password, member } = body;

    if (!email || !password || !member) {
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fbUser = await auth.createUser({
      email,
      password,
    });

    const memberData: AppUser = member as AppUser;

    if (memberData.profileImage) {
      await renameFile(
        `users/${memberData.email}/${getFileName(memberData.profileImage)}`,
        `users/${fbUser.uid}/${getFileName(memberData.profileImage)}`
      );

      memberData.profileImage = memberData.profileImage?.replace(
        encodeURIComponent(memberData.email),
        fbUser.uid
      );
    }

    // Set custom claims for the user
    const customClaims = {
      admin: true,
    };

    if (fbUser) {
      await auth.setCustomUserClaims(fbUser.uid, customClaims);
      await db
        .collection("users")
        .doc(fbUser.uid)
        .set({ ...member, id: fbUser.uid });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({ error: "Error" }), {
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
