"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { generateProfitAndLossReport } from "@/app/(app)/reports/actions";
import { CSVLink } from "react-csv";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAppSettings } from "@/components/app-settings-provider";
import { getCurrencySymbol } from "@/lib/currencies";

interface ProfitAndLossReportDownloaderProps {
  startDate?: Date;
  endDate?: Date;
  onValidate: () => boolean;
}

type CsvData = {
  "Category": string;
  "Amount": string;
};

export function ProfitAndLossReportDownloader({ startDate, endDate, onValidate }: ProfitAndLossReportDownloaderProps) {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<CsvData[]>([]);
  const [readyToDownload, setReadyToDownload] = useState(false);
  const { toast } = useToast();
  const { settings } = useAppSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);

  const handleGenerateReport = async () => {
    if (!onValidate()) return;

    setLoading(true);
    setReadyToDownload(false);

    const formData = new FormData();
    formData.append("startDate", startDate!.toISOString());
    formData.append("endDate", endDate!.toISOString());

    const result = await generateProfitAndLossReport({ message: "", data: undefined }, formData);
    
    if (result.issues || !result.data) {
      toast({
        title: "Error Generating Report",
        description: result.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    const { totalRevenue, totalExpenses, netProfitOrLoss } = result.data;
    
    if (totalRevenue === 0 && totalExpenses === 0) {
        toast({
            title: "No Data",
            description: "No sales or expenses found for the selected date range.",
            variant: "default",
        });
        setLoading(false);
        return;
    }

    const formattedData: CsvData[] = [
        { "Category": "Total Revenue", "Amount": `${currencySymbol}${totalRevenue.toFixed(2)}` },
        { "Category": "Total Expenses", "Amount": `${currencySymbol}${totalExpenses.toFixed(2)}` },
        { "Category": "Net Profit/Loss", "Amount": `${currencySymbol}${netProfitOrLoss.toFixed(2)}` },
    ];
    
    setReportData(formattedData);
    setReadyToDownload(true);
    setLoading(false);
    toast({
        title: "Report Ready",
        description: "Your Profit & Loss report is ready to be downloaded."
    })
  };

  const csvHeaders = [
    { label: "Category", key: "Category" },
    { label: "Amount", key: "Amount" },
  ];

  return (
    <>
      <Button
        className="w-full"
        onClick={handleGenerateReport}
        disabled={!startDate || !endDate || loading}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? "Generating..." : "Generate Report"}
      </Button>

      {readyToDownload && (
        <CSVLink
          data={reportData}
          headers={csvHeaders}
          filename={`Profit-Loss-Report_${format(startDate!, 'yyyy-MM-dd')}_to_${format(endDate!, 'yyyy-MM-dd')}.csv`}
          className="w-full"
          target="_blank"
        >
           <Button className="w-full mt-2">
              <Download className="mr-2 h-4 w-4" />
              Download Report
           </Button>
        </CSVLink>
      )}
    </>
  );
}