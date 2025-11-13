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
  ArrowUpWideNarrow,
  ArrowDownNarrowWide,
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import Loading from "@/src/components/ui/loading";

interface RevenueRow {
  eventId: string;
  eventName: string;
  city: string;
  totalRevenue: number;
  ticketsSold: number;
  averageTicketPrice: number;
  paymentMethods: string;
}

interface TableResponse {
  data: RevenueRow[];
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

export default function RevenueTable() {
  const [tableData, setTableData] = useState<TableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("totalRevenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    eventId: "",
    city: "",
  });

  const [timeRange, setTimeRange] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");

  // Load table data
  useEffect(() => {
    loadTableData();
  }, [currentPage, pageSize, sortBy, sortOrder, filters]);

  // Update filters when selectedEvent changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      eventId: selectedEvent === "all" ? "" : selectedEvent,
    }));
  }, [selectedEvent]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      city: selectedCity === "all" ? "" : selectedCity,
    }));
  }, [selectedCity]);

  useEffect(() => {
    function formatLocalDate(date: Date | string) {
      if (typeof date === "string") {
        // Convert "DD-MM-YYYY" to "YYYY-MM-DD"
        const parts = date.split("-");
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
        return date; // fallback
      }
      // Date object: format as "YYYY-MM-DD" in local time
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    let startDate = "";
    let endDate = "";

    const now = new Date();
    if (timeRange === "today") {
      startDate = formatLocalDate(
        new Date(now.getFullYear(), now.getMonth(), now.getDate())
      );
      endDate = formatLocalDate(
        new Date(now.getFullYear(), now.getMonth(), now.getDate())
      );
    } else if (timeRange === "this-week") {
      const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      startDate = formatLocalDate(
        new Date(monday.getFullYear(), monday.getMonth(), monday.getDate())
      );
      endDate = formatLocalDate(
        new Date(now.getFullYear(), now.getMonth(), now.getDate())
      );
    } else if (timeRange === "this-month") {
      startDate = formatLocalDate(
        new Date(now.getFullYear(), now.getMonth(), 1)
      );
      endDate = formatLocalDate(
        new Date(now.getFullYear(), now.getMonth(), now.getDate())
      );
    } else if (timeRange === "custom") {
      startDate = filters.startDate;
      endDate = filters.endDate;
    } else if (timeRange === "all") {
      startDate = "";
      endDate = "";
    }

    setFilters((prev) => ({
      ...prev,
      startDate,
      endDate,
    }));
  }, [timeRange]);

  async function loadTableData() {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        type: "revenue",
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== "")
        ),
      });
      params.forEach((v, k) => console.log(k, v));
      const response = await fetch(`/api/admin/reports/tables?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch table data");
      }

      const data = await response.json();
      setTableData(data);
    } catch (error) {
      console.error("Error loading table:", error);
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
    setCurrentPage(1); // Reset to first page
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
      {/* Filters */}
      <div className="flex flex-col gap-4 my-6 md:flex-row">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="custom">Custom Date Range</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={selectedEvent}
          onValueChange={(value) => setSelectedEvent(value)}
        >
          <SelectTrigger className="w-full md:w-[250px]">
            <SelectValue placeholder="Event Name" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {tableData.data.map((data) => (
              <SelectItem key={data.eventId} value={data.eventId}>
                {data.eventName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {[...new Set<string>(tableData.data.map((data) => data.city))].map(
              (city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className=" uppercase  cursor-pointer hover:bg-neutral-200"
                  onClick={() => handleSort("eventName")}
                >
                  <span className="flex justify-center items-center gap-2">
                    Event Name{" "}
                    {sortBy === "eventName" &&
                      (sortOrder === "asc" ? (
                        <ArrowDownNarrowWide className="w-4 h-4 text-orangeColor" />
                      ) : (
                        <ArrowUpWideNarrow className="w-4 h-4 text-orangeColor" />
                      ))}
                  </span>
                </TableHead>
                <TableHead
                  className="uppercase tracking-wider cursor-pointer hover:bg-neutral-200"
                  onClick={() => handleSort("city")}
                >
                  <span className="flex justify-center items-center gap-2">
                    City{" "}
                    {sortBy === "city" &&
                      (sortOrder === "asc" ? (
                        <ArrowDownNarrowWide className="w-4 h-4 text-orangeColor" />
                      ) : (
                        <ArrowUpWideNarrow className="w-4 h-4 text-orangeColor" />
                      ))}
                  </span>
                </TableHead>
                <TableHead
                  className=" uppercase tracking-wider cursor-pointer hover:bg-neutral-200"
                  onClick={() => handleSort("totalRevenue")}
                >
                  <span className="flex justify-center items-center gap-2">
                    Total Revenue{" "}
                    {sortBy === "totalRevenue" &&
                      (sortOrder === "asc" ? (
                        <ArrowDownNarrowWide className="w-4 h-4 text-orangeColor" />
                      ) : (
                        <ArrowUpWideNarrow className="w-4 h-4 text-orangeColor" />
                      ))}
                  </span>
                </TableHead>
                <TableHead
                  className=" uppercase tracking-wider cursor-pointer hover:bg-neutral-200"
                  onClick={() => handleSort("ticketsSold")}
                >
                  <span className="flex justify-center items-center gap-2">
                    Tickets Sold{" "}
                    {sortBy === "ticketsSold" &&
                      (sortOrder === "asc" ? (
                        <ArrowDownNarrowWide className="w-4 h-4 text-orangeColor" />
                      ) : (
                        <ArrowUpWideNarrow className="w-4 h-4 text-orangeColor" />
                      ))}
                  </span>
                </TableHead>
                <TableHead
                  className=" uppercase tracking-wider cursor-pointer hover:bg-neutral-200"
                  onClick={() => handleSort("averageTicketPrice")}
                >
                  <span className="flex justify-center items-center gap-2">
                    Avg Price{" "}
                    {sortBy === "averageTicketPrice" &&
                      (sortOrder === "asc" ? (
                        <ArrowDownNarrowWide className="w-4 h-4 text-orangeColor" />
                      ) : (
                        <ArrowUpWideNarrow className="w-4 h-4 text-orangeColor" />
                      ))}
                  </span>
                </TableHead>
                <TableHead className=" uppercase tracking-wider">
                  Payment Methods
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.data.map((row) => (
                <TableRow key={row.eventId}>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={`/events/${row.eventId}`}
                      className=" hover:text-gray-600 font-medium"
                    >
                      {row.eventName}
                    </a>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.city}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                    <span className="icon-saudi_riyal text-md font-light" />
                    {row.totalRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.ticketsSold}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="icon-saudi_riyal text-md font-light" />
                    {row.averageTicketPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-500">
                    {row.paymentMethods}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

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

      {/* Loading Overlay */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loading />
        </div>
      )}
    </div>
  );
}

// Helper function for pagination range
export function getPaginationRange(
  current: number,
  total: number
): (number | string)[] {
  const delta = 2;
  const range: (number | string)[] = [];
  const rangeWithDots: (number | string)[] = [];

  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    ) {
      range.push(i);
    }
  }

  let prev: number | undefined;
  for (const i of range) {
    if (prev !== undefined) {
      if (i !== prev + 1) {
        rangeWithDots.push("...");
      }
    }
    rangeWithDots.push(i);
    prev = i as number;
  }

  return rangeWithDots;
}
