import { parseUnits } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";

// Simple ERC20 ABI for the approve function
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

export function useERC20() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const approveToken = async (
    tokenAddress: `0x${string}`,
    spender: `0x${string}`,
    amount: string,
    decimals: number,
  ) => {
    if (!walletClient) throw new Error("Wallet not connected");

    const parsedAmount = parseUnits(amount, decimals);

    const { request } = await publicClient.simulateContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, parsedAmount],
      account: walletClient.account,
    });

    return walletClient.writeContract(request);
  };

  return { approveToken };
}
