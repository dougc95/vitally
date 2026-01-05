
import { useQuery } from "@tanstack/react-query";
import { FHIRBundle, FHIRPatient } from "@shared/types/fhir";
import { apiRequest } from "@/lib/queryClient"; // or just use fetch wrapper if apiRequest returns Response

export function useFHIRPatient() {
  return useQuery({
    queryKey: ["/api/export/fhir/patient"],
    queryFn: async () => {
      const res = await fetch("/api/export/fhir/patient");
      if (!res.ok) throw new Error("Failed to export patient");
      return res.json() as Promise<FHIRPatient>;
    }
  });
}

export function useFHIRObservations(from?: string, to?: string) {
  const queryKey = ["/api/export/fhir/observations", { from, to }];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if(from) params.append("from", from);
      if(to) params.append("to", to);
      
      const res = await fetch(`/api/export/fhir/observations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to export observations");
      return res.json() as Promise<FHIRBundle>;
    }
  });
}

export function useFHIRFullBundle(from?: string, to?: string) {
     // Usually we trigger this on demand (download), not useQuery.
     // But useQuery is fine for fetching data to show/download.
     // Better pattern for file download: fetchBlob and trigger save.
     
     const downloadBundle = async () => {
          const params = new URLSearchParams();
          if(from) params.append("from", from);
          if(to) params.append("to", to);
          
          const res = await fetch(`/api/export/fhir/bundle?${params.toString()}`);
          if (!res.ok) throw new Error("Failed to generate bundle");
          
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `fhir-export-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
     };

     return { downloadBundle };
}
