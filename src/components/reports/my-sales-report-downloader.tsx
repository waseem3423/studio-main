
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { generateMySalesReport } from "@/app/(app)/reports/actions";
import { CSVLink } from "react-csv";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedSale } from "@/app/(app)/reports/actions";
import { format } from "date-fns";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

interface MySalesReportDownloaderProps {
  startDate?: Date;
  endDate?: Date;
  onValidate: () => boolean;
}

type CsvData = {
  "Sale ID": string;
  "Date": string;
  "Customer Name": string;
  "Customer Phone": string;
  "Customer Address": string;
  "Product Name": string;
  "Quantity": number;
  "Unit Price": number;
  "Row Total": number;
  "Discount": number;
  "Total Amount": number;
};


export function MySalesReportDownloader({ startDate, endDate, onValidate }: MySalesReportDownloaderProps) {
  const [user] = useAuthState(auth);
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

    const result = await generateMySalesReport({ message: "", data: undefined }, formData);
    
    if (result.issues || !result.data) {
      toast({
        title: "Error Generating Report",
        description: result.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    if(result.data.sales.length === 0) {
        toast({
            title: "No Data",
            description: "No sales found for the selected date range.",
            variant: "default",
        });
        setLoading(false);
        return;
    }

    const flattenedData = flattenSalesData(result.data.sales);
    setReportData(flattenedData);
    setReadyToDownload(true);
    setLoading(false);
    toast({
        title: "Report Ready",
        description: "Your sales report is ready to be downloaded."
    })
  };

  const flattenSalesData = (sales: EnrichedSale[]): CsvData[] => {
    const data: CsvData[] = [];
    sales.forEach(sale => {
      sale.products.forEach(product => {
        data.push({
          "Sale ID": sale.id,
          "Date": format(new Date(sale.date as string), "yyyy-MM-dd"),
          "Customer Name": sale.customerName,
          "Customer Phone": sale.customerPhone,
          "Customer Address": sale.customerAddress,
          "Product Name": product.productName,
          "Quantity": product.quantity,
          "Unit Price": product.unitPrice,
          "Row Total": product.quantity * product.unitPrice,
          "Discount": sale.discount || 0,
          "Total Amount": sale.totalAmount
        });
      });
    });
    return data;
  }

  const csvHeaders = [
    { label: "Sale ID", key: "Sale ID" },
    { label: "Date", key: "Date" },
    { label: "Customer Name", key: "Customer Name" },
    { label: "Customer Phone", key: "Customer Phone" },
    { label: "Customer Address", key: "Customer Address" },
    { label: "Product Name", key: "Product Name" },
    { label: "Quantity", key: "Quantity" },
    { label: "Unit Price", key: "Unit Price" },
    { label: "Row Total", key: "Row Total" },
    { label: "Discount", key: "Discount" },
    { label: "Total Amount", key: "Total Amount" },
  ];

  return (
    <>
      <Button
        className="w-full"
        onClick={handleGenerateReport}
        disabled={!startDate || !endDate || loading || !user}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? "Generating..." : "Generate Report"}
      </Button>

      {readyToDownload && (
        <CSVLink
          data={reportData}
          headers={csvHeaders}
          filename={`My_Sales_Report_${format(startDate!, 'yyyy-MM-dd')}_to_${format(endDate!, 'yyyy-MM-dd')}.csv`}
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
