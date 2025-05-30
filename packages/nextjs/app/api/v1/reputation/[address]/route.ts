import { NextResponse } from "next/server";
import { fetchAddressData } from "~~/services/addressService";
import { calculateReputationScore } from "~~/services/reputationService";

interface ErrorResponse {
  error: string;
  timestamp: string;
}

type RouteContext = {
  params: {
    address: string;
  };
};

// Cache reputation scores for 1 hour by default
const DEFAULT_CACHE_TIME = 3600; // seconds

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { address } = context.params;
  const requestUrl = new URL(request.url);
  const refreshParam = requestUrl.searchParams.get("refresh") === "true";
  const cacheTime = refreshParam ? 0 : DEFAULT_CACHE_TIME;

  console.log(`[${new Date().toISOString()}] Reputation request for address: ${address}`);

  try {
    // Validate Ethereum address
    if (!isValidEthereumAddress(address)) {
      throw new Error("Invalid Ethereum address format");
    }

    // Fetch address data (with cache control)
    const combinedData = await fetchAddressData(address);

    // Calculate reputation score
    const reputationScore = calculateReputationScore(combinedData);

    // Add metadata to the response
    const response = {
      ...reputationScore,
      metadata: {
        address,
        timestamp: new Date().toISOString(),
        calculationVersion: "1.0",
      },
    };

    // Return with appropriate caching headers
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": `max-age=${cacheTime}, s-maxage=${cacheTime}`,
        "Last-Modified": new Date().toUTCString(),
      },
    });
  } catch (error: unknown) {
    console.error(`[${new Date().toISOString()}] Error calculating reputation for ${address}:`, error);

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      } as ErrorResponse,
      {
        status: error instanceof Error && error.message.includes("Invalid") ? 400 : 500,
      },
    );
  }
}

// Helper function to validate Ethereum address format
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
