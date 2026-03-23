import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuarantorProfile {
  id: string;
  full_name: string;
  member_number: string;
  department: string;
  phone: string;
}

interface GuarantorAutocompleteProps {
  value: GuarantorProfile | null;
  onChange: (guarantor: GuarantorProfile | null) => void;
  excludeUserIds: string[];
  label: string;
  error?: string;
}

export default function GuarantorAutocomplete({
  value,
  onChange,
  excludeUserIds,
  label,
  error
}: GuarantorAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [guarantors, setGuarantors] = useState<GuarantorProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length >= 2) {
      searchGuarantors();
    } else {
      setGuarantors([]);
    }
  }, [search, excludeUserIds]);

  const searchGuarantors = async () => {
    setLoading(true);
    try {
      // Use secure RPC that only returns safe fields
      const { data, error } = await supabase
        .rpc('search_guarantor_profiles', {
          search_term: search,
          exclude_ids: excludeUserIds
        });

      if (error) throw error;

      setGuarantors((data || []) as GuarantorProfile[]);
    } catch (error) {
      console.error("Error searching guarantors:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              error && "border-destructive",
              !value && "text-muted-foreground"
            )}
          >
            {value ? `${value.full_name} (${value.member_number})` : "Search by name or TRCN number..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? "Searching..." : search.length < 2 ? "Type at least 2 characters" : "No members found"}
              </CommandEmpty>
              <CommandGroup>
                {guarantors.map((guarantor) => (
                  <CommandItem
                    key={guarantor.id}
                    value={guarantor.id}
                    onSelect={() => {
                      onChange(guarantor);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === guarantor.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{guarantor.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {guarantor.member_number} • {guarantor.department}{guarantor.phone ? ` • ${guarantor.phone}` : ''}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <div className="flex items-start justify-between p-3 bg-muted rounded-lg">
          <div className="flex-1 space-y-1">
            <p className="font-medium">{value.full_name}</p>
            <p className="text-sm text-muted-foreground">TRCN No: {value.member_number}</p>
            <p className="text-sm text-muted-foreground">Department: {value.department}</p>
            {value.phone && <p className="text-sm text-muted-foreground">Phone: {value.phone}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
