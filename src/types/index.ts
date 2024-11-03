export interface Sample {
  chip_id: string;
  status: string;
  location?: string;
  timestamp: string;
  patient_id?: string;
  expected_completion_time?: string;
  batch_number?: string;
  mfg_date?: string;
  final_volume?: number;
  average_co2?: number;
  error?: string;
  document_urls?: string[];
} 