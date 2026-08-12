"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type FiltersProps = {
  people: { id: string; name: string }[];
  bookmakers: { id: string; name: string }[];
  betTypes: { id: string; name: string }[];
  showStatus?: boolean;
};

const ALL = "all";

export function BetFilters({ people, bookmakers, betTypes, showStatus = true }: FiltersProps) {
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

      <div className="w-48">
        <Select
          value={searchParams.get("bookmaker") ?? ALL}
          onValueChange={(v) => setParam("bookmaker", v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Bookmaker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All bookmakers</SelectItem>
            {bookmakers.map((bookmaker) => (
              <SelectItem key={bookmaker.id} value={bookmaker.id}>
                {bookmaker.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-44">
        <Select value={searchParams.get("betType") ?? ALL} onValueChange={(v) => setParam("betType", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Bet type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All bet types</SelectItem>
            {betTypes.map((betType) => (
              <SelectItem key={betType.id} value={betType.id}>
                {betType.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showStatus && (
        <div className="w-36">
          <Select value={searchParams.get("status") ?? ALL} onValueChange={(v) => setParam("status", v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="SETTLED">Settled</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Button variant="ghost" onClick={() => router.push(pathname)}>
        Clear filters
      </Button>
    </div>
  );
}
