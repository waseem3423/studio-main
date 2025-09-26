
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { generateWorkerTaskHistoryReport } from "@/app/(app)/reports/actions";
import { CSVLink } from "react-csv";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type CsvData = {
  "Task ID": string;
  "Task Description": string;
  "Completion Date": string;
};

export function MyTaskHistoryReportDownloader() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<CsvData[]>([]);
  const [readyToDownload, setReadyToDownload] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setLoading(true);
    setReadyToDownload(false);

    // FormData is not strictly needed here but we keep it for consistency
    const result = await generateWorkerTaskHistoryReport({ message: "", data: undefined }, new FormData());
    
    if (!result.data || result.data.tasks.length === 0) {
      toast({
        title: "No Data",
        description: result.message || "No completed tasks found to generate a report.",
        variant: "default",
      });
      setLoading(false);
      return;
    }
    
    const formattedData: CsvData[] = result.data.tasks.map(task => ({
        "Task ID": task.id,
        "Task Description": task.task,
        "Completion Date": format(new Date(task.completedAt as string), "yyyy-MM-dd HH:mm:ss"),
    }));

    setReportData(formattedData);
    setReadyToDownload(true);
    setLoading(false);
    toast({
        title: "Report Ready",
        description: "Your task history report is ready to be downloaded."
    });
  };

  const csvHeaders = [
    { label: "Task ID", key: "Task ID" },
    { label: "Task Description", key: "Task Description" },
    { label: "Completion Date", key: "Completion Date" },
  ];

  return (
    <>
      <Button
        className="w-full mt-4"
        onClick={handleGenerateReport}
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? "Generating..." : "Generate & Download Report"}
      </Button>

      {readyToDownload && (
        <CSVLink
          data={reportData}
          headers={csvHeaders}
          filename={`My_Task_History_${format(new Date(), 'yyyy-MM-dd')}.csv`}
          className="w-full"
          target="_blank"
        >
           <Button className="w-full mt-2" variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Download Again
           </Button>
        </CSVLink>
      )}
    </>
  );
}
