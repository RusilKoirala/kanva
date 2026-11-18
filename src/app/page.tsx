import Image from "next/image";
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
   <div>
     <Button size="sm">Click me</Button>
      <p className="text-red-500 font-semibold hover:black">
        Rusil
      </p>
   </div>
  );
}
