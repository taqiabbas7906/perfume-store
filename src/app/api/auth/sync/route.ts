import { NextRequest, NextResponse } from "next/server";
import { syncUserToDB } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json()
        if (!token) {
            return NextResponse.json(
                { error: "Token is required" },
                { status: 400 }
            )
        }
        const user = await syncUserToDB(token)
        if (!user) {
            return NextResponse.json(
                { error: "Failed to sync user" },
                { status: 401 },
            )
        }
        return NextResponse.json({ success: true, user })
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}