import { NextResponse } from "next/server";
import { fetchAddressData } from "~~/services/addressService";
import { calculateReputationScore } from "~~/services/reputationService";

interface ErrorResponse {
  error: string;
}

type RouteContext = {
  params: {
    address: string;
  };
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { address } = context.params;

  try {
    const combinedData = await fetchAddressData(address);
    const reputationScore = calculateReputationScore(combinedData);

    return NextResponse.json(reputationScore);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage } as ErrorResponse, { status: 500 });
  }
}
