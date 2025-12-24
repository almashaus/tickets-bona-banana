import { Skeleton } from "../../components/ui/skeleton";

export default function LoadingEvents() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 justify-center items-center gap-4 my-10">
      {Array.from([1, 2, 3]).map((data, index) => (
        <div
          className="bg-darkColor w-72 md:w-80 space-y-3 m-1 p-3 rounded-lg"
          key={index}
        >
          <Skeleton className="h-56 rounded-lg bg-muted-foreground" />
          <Skeleton className="h-24 rounded-lg bg-beigeColor" />
          <div className="grid grid-cols-2 gap-3 justify-between items-center ">
            <Skeleton className="h-14 rounded-lg bg-redColor" />
            <Skeleton className="h-14 rounded-lg bg-yellowColor" />
          </div>
        </div>
      ))}
    </div>
  );
}
