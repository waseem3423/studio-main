
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { generateExpenseReport } from "@/app/(app)/reports/actions";
import { CSVLink } from "react-csv";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@/lib/data";
import { format } from "date-fns";

interface ExpenseReportDownloaderProps {
  startDate?: Date;
  endDate?: Date;
  onValidate: () => boolean;
}

type CsvData = {
  "ID": string;
  "Date": string;
  "Category": string;
  "Description": string;
  "Amount": number;
};

export function ExpenseReportDownloader({ startDate, endDate, onValidate }: ExpenseReportDownloaderProps) {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<CsvData[]>([]);
  const [readyToDownload, setReadyToDownload] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!onValidate()) return;

    setLoading(true);
    setReadyToDownload(false);

    const formData = new FormData();
    formData.append("startDate", startDate!.toISOString());
    formData.append("endDate", endDate!.toISOString());

    const result = await generateExpenseReport({ message: "", data: undefined }, formData);
    
    if (result.issues || !result.data) {
      toast({
        title: "Error Generating Report",
        description: result.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    if(result.data.expenses.length === 0) {
        toast({
            title: "No Data",
            description: "No expenses found for the selected date range.",
            variant: "default",
        });
        setLoading(false);
        return;
    }

    const flattenedData = flattenExpensesData(result.data.expenses);
    setReportData(flattenedData);
    setReadyToDownload(true);
    setLoading(false);
    toast({
        title: "Report Ready",
        description: "Your expense report is ready to be downloaded."
    })
  };

  const flattenExpensesData = (expenses: Expense[]): CsvData[] => {
    return expenses.map(expense => ({
        "ID": expense.id,
        "Date": format(new Date(expense.date), "yyyy-MM-dd"),
        "Category": expense.category,
        "Description": expense.description,
        "Amount": expense.amount,
    }));
  }

  const csvHeaders = [
    { label: "ID", key: "ID" },
    { label: "Date", key: "Date" },
    { label: "Category", key: "Category" },
    { label: "Description", key: "Description" },
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
          filename={`Expense_Report_${format(startDate!, 'yyyy-MM-dd')}_to_${format(endDate!, 'yyyy-MM-dd')}.csv`}
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
