import { useState, useEffect } from "react";
import {
  keccak256,
  concat,
  pad,
  toHex,
  encodeFunctionData,
  decodeFunctionResult,
  type PublicClient,
} from "viem";
import { usePublicClient } from "wagmi";
import {
  RENDERER_ADDRESS,
  ART_SELECTION_ADDRESS,
  rendererAbi,
} from "./contracts";

const ART_SELECTION_MAPPING_SLOT = 2n;

function artSelectionSlots(tokenId: bigint) {
  const baseSlot = keccak256(
    concat([
      pad(toHex(tokenId), { size: 32 }),
      pad(toHex(ART_SELECTION_MAPPING_SLOT), { size: 32 }),
    ]),
  );
  const nextSlot = toHex(BigInt(baseSlot) + 1n, { size: 32 });
  return {
    hashSlot: baseSlot as `0x${string}`,
    selectedBySlot: nextSlot as `0x${string}`,
  };
}

function packSelectedBy(
  address: `0x${string}`,
  isActive: boolean,
): `0x${string}` {
  const addrBig = BigInt(address);
  const activeBit = isActive ? 1n << 160n : 0n;
  return toHex(addrBig | activeBit, { size: 32 });
}

export interface PastLook {
  hash: `0x${string}`;
  svg: string | null;
  selectedBy: `0x${string}`;
  block: bigint;
}

async function fetchPreviewSvg(
  client: PublicClient,
  tokenId: bigint,
  customHash: `0x${string}`,
  owner: `0x${string}`,
): Promise<string | null> {
  try {
    const { hashSlot, selectedBySlot } = artSelectionSlots(tokenId);
    const packedOwner = packSelectedBy(owner, true);

    const data = encodeFunctionData({
      abi: rendererAbi,
      functionName: "tokenURI",
      args: [tokenId],
    });

    const callResult = await client.call({
      to: RENDERER_ADDRESS,
      data,
      stateOverride: [
        {
          address: ART_SELECTION_ADDRESS,
          stateDiff: [
            { slot: hashSlot, value: customHash },
            { slot: selectedBySlot, value: packedOwner },
          ],
        },
      ],
    });

    const uri = decodeFunctionResult({
      abi: rendererAbi,
      functionName: "tokenURI",
      data: callResult.data!,
    });

    const jsonB64 = (uri as string).replace(
      "data:application/json;base64,",
      "",
    );
    const metadata = JSON.parse(atob(jsonB64));
    const img = metadata.image as string;
    if (img?.startsWith("data:image/svg+xml;base64,")) {
      return atob(img.replace("data:image/svg+xml;base64,", ""));
    }
    if (img?.startsWith("data:image/svg+xml,")) {
      return decodeURIComponent(img.replace("data:image/svg+xml,", ""));
    }
  } catch {}
  return null;
}

export function usePastLooks(
  tokenId: bigint,
  ownerAddress: `0x${string}`,
) {
  const publicClient = usePublicClient();
  const [looks, setLooks] = useState<PastLook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const logs = await publicClient!.getLogs({
          address: ART_SELECTION_ADDRESS,
          event: {
            type: "event" as const,
            name: "ArtSelected" as const,
            inputs: [
              { name: "tokenId", type: "uint256", indexed: true } as const,
              { name: "selectedBy", type: "address", indexed: true } as const,
              { name: "customHash", type: "bytes32", indexed: false } as const,
            ],
          },
          args: { tokenId },
          fromBlock: 0n,
          toBlock: "latest",
        });

        if (cancelled) return;

        const seen = new Map<string, { selectedBy: `0x${string}`; block: bigint }>();
        for (const log of logs) {
          const hash = log.args.customHash!;
          const selectedBy = log.args.selectedBy!;
          seen.set(hash, { selectedBy, block: log.blockNumber });
        }

        const uniqueHashes = Array.from(seen.entries()).map(
          ([hash, meta]) => ({
            hash: hash as `0x${string}`,
            svg: null as string | null,
            selectedBy: meta.selectedBy,
            block: meta.block,
          }),
        );

        setLooks(uniqueHashes);
        setLoading(false);

        const CONCURRENCY = 3;
        for (let i = 0; i < uniqueHashes.length; i += CONCURRENCY) {
          const batch = uniqueHashes.slice(i, i + CONCURRENCY);
          const results = await Promise.allSettled(
            batch.map(async (look) => {
              const svg = await fetchPreviewSvg(
                publicClient!,
                tokenId,
                look.hash,
                ownerAddress,
              );
              return { hash: look.hash, svg };
            }),
          );

          if (cancelled) return;

          setLooks((prev) =>
            prev.map((l) => {
              const match = results.find(
                (r) => r.status === "fulfilled" && r.value.hash === l.hash,
              );
              if (match && match.status === "fulfilled" && match.value.svg) {
                return { ...l, svg: match.value.svg };
              }
              return l;
            }),
          );
        }
      } catch {
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [publicClient, tokenId, ownerAddress]);

  return { looks, loading };
}
