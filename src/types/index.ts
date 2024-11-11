export interface Sample {
  chip_id: string;
  status: string;
  sample_type?: string;
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

export interface AnalyzedSample {
  chip_id: string;
  batch_number?: number;
  mfg_date?: string;
  location?: string;
  timestamp: string;
  patient_id: string;
  average_co2: number;
  final_volume: number;
  status?: string;
  'Pentanal': number;
  'Decanal': number;
  '2-Butanone': number;
  '2-hydroxy-acetaldehyde': number;
  '2-hydroxy-3-butanone': number;
  '4-HHE': number;
  '4HNE': number;
  'Dx': string;
} 

export interface PickupData {
  volume: number;
  co2_level: number;
  error?: string;
}