import api from "@/api/client";

export async function acceptStocksAgreement(version: "v1", acceptedAt: string): Promise<{ ok: boolean }> {
  const res = await api.post<{ ok: boolean }>("/agreements/stocks", {
    accepted: true,
    version,
    acceptedAt,
  });
  return res.data;
}
