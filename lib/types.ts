export type DatasetMode = "rank" | "compare";

export type DatasetItem = {
  id: number;
  datasetId: string;
  label: string;
  value: number;
  color: string | null;
  sortOrder: number;
};

export type Dataset = {
  id: string;
  title: string;
  mode: DatasetMode;
  unit: string;
  source: string;
  sourceUrl: string;
  year: number | null;
  createdAt: string;
  updatedAt: string;
  items: DatasetItem[];
};

export type DatasetSummary = Omit<Dataset, "items"> & { itemCount: number };

export type CensusPullInput = {
  naics: string;
  title?: string;
  year?: number;
  topN?: number;
};
