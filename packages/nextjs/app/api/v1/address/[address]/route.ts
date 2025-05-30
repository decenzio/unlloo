import { NextResponse } from "next/server";
import { fetchAddressData } from "~~/services/addressService";

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
    return NextResponse.json(combinedData);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage } as ErrorResponse, { status: 500 });
  }
}
