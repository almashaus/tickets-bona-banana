"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import {
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  ArrowUpWideNarrow,
  ArrowDownWideNarrow,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import Loading from "@/src/components/ui/loading";
import { getPaginationRange } from "./revenueTable";

interface AttendanceRow {
  eventId: string;
  eventName: string;
  city: string;
  totalOrders: number;
  usedTickets: number;
  unusedTickets: number;
  totalTickets: number;
  attendancePercentage: number;
}

interface AttendanceTableResponse {
  data: AttendanceRow[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  cached: boolean;
}

export default function AttendanceTable() {
  const [tableData, setTableData] = useState<AttendanceTableResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("totalOrders");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadTableData();
  }, [currentPage, pageSize, sortBy, sortOrder]);

  async function loadTableData() {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        type: "attendance",
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/admin/reports/tables?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch attendance data");
      }

      const data = await response.json();

      setTableData(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
  }

  if (loading && !tableData) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading />
      </div>
    );
  }

  if (!tableData) return null;

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-white rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className=" uppercase cursor-pointer hover:bg-neutral-200"
                onClick={() => handleSort("eventName")}
              >
                <span className="flex justify-center items-center gap-2">
                  Event Name{" "}
                  {sortBy === "eventName" &&
                    (sortOrder === "asc" ? (
                      <ArrowUpWideNarrow className="w-4 h-4 text-orangeColor" />
                    ) : (
                      <ArrowDownWideNarrow className="w-4 h-4 text-orangeColor" />
                    ))}
                </span>
              </TableHead>
              <TableHead
                className=" uppercase cursor-pointer hover:bg-neutral-200"
                onClick={() => handleSort("totalOrders")}
              >
                <span className="flex justify-center items-center gap-2">
                  Orders{" "}
                  {sortBy === "totalOrders" &&
                    (sortOrder === "asc" ? (
                      <ArrowUpWideNarrow className="w-4 h-4 text-orangeColor" />
                    ) : (
                      <ArrowDownWideNarrow className="w-4 h-4 text-orangeColor" />
                    ))}
                </span>
              </TableHead>
              <TableHead
                className=" uppercase cursor-pointer hover:bg-neutral-200"
                onClick={() => handleSort("usedTickets")}
              >
                <span className="flex justify-center items-center gap-2">
                  Used{" "}
                  {sortBy === "usedTickets" &&
                    (sortOrder === "asc" ? (
                      <ArrowUpWideNarrow className="w-4 h-4 text-orangeColor" />
                    ) : (
                      <ArrowDownWideNarrow className="w-4 h-4 text-orangeColor" />
                    ))}
                </span>
              </TableHead>
              <TableHead
                className=" uppercase cursor-pointer hover:bg-neutral-200"
                onClick={() => handleSort("unusedTickets")}
              >
                <span className="flex justify-center items-center gap-2">
                  Unused{" "}
                  {sortBy === "unusedTickets" &&
                    (sortOrder === "asc" ? (
                      <ArrowUpWideNarrow className="w-4 h-4 text-orangeColor" />
                    ) : (
                      <ArrowDownWideNarrow className="w-4 h-4 text-orangeColor" />
                    ))}
                </span>
              </TableHead>
              <TableHead
                className=" uppercase cursor-pointer hover:bg-neutral-200"
                onClick={() => handleSort("attendancePercentage")}
              >
                <span className="flex justify-center items-center gap-2">
                  Attendance %{" "}
                  {sortBy === "attendancePercentage" &&
                    (sortOrder === "asc" ? (
                      <ArrowUpWideNarrow className="w-4 h-4 text-orangeColor" />
                    ) : (
                      <ArrowDownWideNarrow className="w-4 h-4 text-orangeColor" />
                    ))}
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.data.map((row) => (
              <TableRow key={row.eventId}>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <a href={`/events/${row.eventId}`} className=" font-medium">
                    {row.eventName}
                  </a>
                  <div className="text-sm text-muted-foreground">
                    {row.city}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                  {row.totalOrders}
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                  {row.usedTickets}
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                  {row.unusedTickets}
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                      <div
                        className={`h-2 rounded-full ${
                          row.attendancePercentage >= 80
                            ? "bg-green-500"
                            : row.attendancePercentage >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${row.attendancePercentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold">
                      {row.attendancePercentage}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 flex flex-col space-y-3 md:space-y-0 md:flex-row items-center justify-between border-t border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-full">
              <span className="text-sm">
                <span className="text-gray-500">
                  {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(
                    currentPage * pageSize,
                    tableData.pagination.totalItems
                  )}{" "}
                </span>
                of {tableData.pagination.totalItems} results{" "}
              </span>
            </div>

            <Select
              value={pageSize.toString()}
              onValueChange={(value) => handlePageSizeChange(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key={"10"} value={"10"}>
                  10 per page
                </SelectItem>
                <SelectItem key={"20"} value={"20"}>
                  20 per page
                </SelectItem>
                <SelectItem key={"50"} value={"50"}>
                  50 per page
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={!tableData.pagination.hasPreviousPage}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronFirst />
            </button>

            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!tableData.pagination.hasPreviousPage}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronLeft />
            </button>

            <div className="flex items-center gap-1">
              {getPaginationRange(
                currentPage,
                tableData.pagination.totalPages
              ).map((page) =>
                page === "..." ? (
                  <span key={page} className="px-3 py-1">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(Number(page))}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      currentPage === Number(page)
                        ? "bg-orangeColor text-white border-orangeColor"
                        : "border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!tableData.pagination.hasNextPage}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronRight />
            </button>

            <button
              onClick={() => handlePageChange(tableData.pagination.totalPages)}
              disabled={!tableData.pagination.hasNextPage}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronLast />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
