"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ALL = "all";

export function ReportFilters({ people }: { people: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <div className="w-40">
        <Select value={searchParams.get("person") ?? ALL} onValueChange={(v) => setParam("person", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Person" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All people</SelectItem>
            {people.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                {person.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-40">
        <Input
          type="date"
          value={searchParams.get("from") ?? ""}
          onChange={(e) => setParam("from", e.target.value)}
        />
      </div>

      <div className="w-40">
        <Input
          type="date"
          value={searchParams.get("to") ?? ""}
          onChange={(e) => setParam("to", e.target.value)}
        />
      </div>

      <Button variant="ghost" onClick={() => router.push(pathname)}>
        Clear filters
      </Button>
    </div>
  );
}
