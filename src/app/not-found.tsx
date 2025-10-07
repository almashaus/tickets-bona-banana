import Link from "next/link";
import { Button } from "../components/ui/button";
import Image from "next/image";

export default function GlobalNotFound() {
  return (
    <div className="flex flex-col justify-center items-center gap-4 min-h-screen min-w-full">
      <Image
        src="/images/404-not-found.png"
        alt="404 Not Found"
        width={300}
        height={300}
      />
      <h1 className="text-3xl font-bold">Page Not Found</h1>
      <div className="text-center text-muted-foreground">
        <p>We couldn't find the page that you were looking for.</p>
      </div>
      <Button asChild>
        <Link href="/">Home Page</Link>
      </Button>
    </div>
  );
}
