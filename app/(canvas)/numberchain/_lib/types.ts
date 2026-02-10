export type TChainCell = {
  value: number; // 0 = empty, 1-N = placed number
  isAnchor: boolean;
  isHinted: boolean;
};
