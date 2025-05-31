import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://eth.blockscout.com/api/v2/stats", {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      // Optional: Add caching
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Return only the coin_price
    return NextResponse.json({
      coin_price: data.coin_price,
    });
  } catch (error) {
    console.error("Error fetching ETH price:", error);
    return NextResponse.json({ error: "Failed to fetch ETH price" }, { status: 500 });
  }
}
