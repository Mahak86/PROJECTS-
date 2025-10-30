import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

export interface FilterCriteria {
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  state?: string;
  testType?: string;
  scoreMin?: number;
  scoreMax?: number;
}

interface AdvancedFilterDialogProps {
  onApplyFilters: (filters: FilterCriteria) => void;
  currentFilters: FilterCriteria;
}

export function AdvancedFilterDialog({
  onApplyFilters,
  currentFilters,
}: AdvancedFilterDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>(currentFilters);

  const indianStates = [
    "All States",
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ];

  const testTypes = [
    "All Tests",
    "Vertical Jump",
    "Shuttle Run",
    "Sit-ups",
    "800m Run",
    "Height & Weight",
    "Endurance Run",
  ];

  const handleApply = () => {
    onApplyFilters(filters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const emptyFilters: FilterCriteria = {};
    setFilters(emptyFilters);
    onApplyFilters(emptyFilters);
    setIsOpen(false);
  };

  const activeFilterCount = Object.keys(filters).filter(
    (key) => filters[key as keyof FilterCriteria] !== undefined && filters[key as keyof FilterCriteria] !== ""
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Filters</DialogTitle>
          <DialogDescription>
            Filter athletes by demographics, performance, and test types.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Age Range */}
          <div className="space-y-3">
            <Label>Age Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageMin" className="text-sm text-muted-foreground">
                  Minimum Age
                </Label>
                <Input
                  id="ageMin"
                  type="number"
                  min="10"
                  max="100"
                  placeholder="Min"
                  value={filters.ageMin || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      ageMin: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageMax" className="text-sm text-muted-foreground">
                  Maximum Age
                </Label>
                <Input
                  id="ageMax"
                  type="number"
                  min="10"
                  max="100"
                  placeholder="Max"
                  value={filters.ageMax || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      ageMax: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={filters.gender || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  gender: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label htmlFor="state">State / Union Territory</Label>
            <Select
              value={filters.state || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  state: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger id="state">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                {indianStates.map((state) => (
                  <SelectItem
                    key={state}
                    value={state === "All States" ? "all" : state}
                  >
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Type */}
          <div className="space-y-2">
            <Label htmlFor="testType">Test Type</Label>
            <Select
              value={filters.testType || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  testType: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger id="testType">
                <SelectValue placeholder="All Tests" />
              </SelectTrigger>
              <SelectContent>
                {testTypes.map((test) => (
                  <SelectItem
                    key={test}
                    value={test === "All Tests" ? "all" : test.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}
                  >
                    {test}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Performance Score Range */}
          <div className="space-y-3">
            <Label>Performance Score Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scoreMin" className="text-sm text-muted-foreground">
                  Minimum Score
                </Label>
                <Input
                  id="scoreMin"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Min"
                  value={filters.scoreMin || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      scoreMin: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scoreMax" className="text-sm text-muted-foreground">
                  Maximum Score
                </Label>
                <Input
                  id="scoreMax"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Max"
                  value={filters.scoreMax || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      scoreMax: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset All
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
