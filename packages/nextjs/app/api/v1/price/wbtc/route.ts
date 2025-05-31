// app/api/wbtc-rate/route.ts (App Router)
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://eth.blockscout.com/api/v2/tokens/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        // Optional: Add caching
        next: { revalidate: 60 }, // Cache for 60 seconds
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Return only the exchange_rate
    return NextResponse.json({
      exchange_rate: data.exchange_rate,
    });
  } catch (error) {
    console.error("Error fetching WBTC exchange rate:", error);
    return NextResponse.json({ error: "Failed to fetch WBTC exchange rate" }, { status: 500 });
  }
}
