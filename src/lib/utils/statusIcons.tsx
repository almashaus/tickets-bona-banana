import { EventStatus } from "@/src/models/event";
import { Clock4Icon, EyeIcon, XIcon, CheckIcon, Check, X } from "lucide-react";

export const getStatusIcon = (status: string) => {
  switch (status) {
    case EventStatus.DRAFT:
      return <Clock4Icon className=" w-4 h-4 text-gray-400 mx-1 " />;
    case EventStatus.PUBLISHED:
      return <EyeIcon className=" w-4 h-4 text-blue-400 mx-1 " />;
    case EventStatus.CANCELED:
      return <XIcon className=" w-4 h-4 text-red-400 mx-1 " />;
    case EventStatus.COMPLETED:
      return <CheckIcon className=" w-4 h-4 text-green-400 mx-1 " />;
    default:
      return <CheckIcon className=" w-4 h-4 text-green-400 mx-1 " />;
  }
};

export function GreenCheck() {
  return (
    <div className="flex justify-center">
      <Check className="h-5 w-5 text-green-500" strokeWidth={3} />
    </div>
  );
}

export function GrayX() {
  return (
    <div className="flex justify-center">
      <X className="h-5 w-5 text-gray-400" />
    </div>
  );
}
