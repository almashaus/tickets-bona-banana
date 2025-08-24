import { db } from "@/src/lib/firebase/firebaseAdminConfig";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const cityDoc = await db.collection("settings").doc("cities").get();
    const data = cityDoc.exists ? cityDoc.data() : {};

    return new Response(JSON.stringify(data), {
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

export async function POST(req: NextRequest) {
  try {
    // const authHeader = req.headers.get("Authorization") || "";

    // const decodedToken = await verifyIdToken(authHeader);

    // if (!decodedToken || !decodedToken.admin) {
    //   return new Response(JSON.stringify({ data: "Unauthorized" }), {
    //     status: 401,
    //     headers: { "Content-Type": "application/json" },
    //   });
    // }

    const body = await req.json();
    const { data } = body;

    const cityDoc = await db.collection("settings").doc("cities").get();
    const currentCities =
      cityDoc.exists && Array.isArray(cityDoc.data()?.city)
        ? cityDoc.data()?.city
        : [];

    const updatedCities = [...currentCities, data];

    await db
      .collection("settings")
      .doc("cities")
      .update({ city: updatedCities });

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
