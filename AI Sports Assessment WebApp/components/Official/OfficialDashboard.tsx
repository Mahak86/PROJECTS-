import { useState, useEffect } from "react";
import { Trophy, Users, TrendingUp, MapPin, BarChart3, User, LogOut, Filter, Search, Download, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { AdvancedFilterDialog, FilterCriteria } from "./AdvancedFilterDialog";
import { exportAthletesCSV, exportToPDF, generateAthleteReportHTML } from "../../utils/exportUtils";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";

interface OfficialDashboardProps {
  user: { id: string; name: string; email: string };
  accessToken: string | null;
  onSignOut: () => void;
}

export function OfficialDashboard({ user, accessToken, onSignOut }: OfficialDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [stats, setStats] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterCriteria>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsResponse, athletesResponse] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b26bdf05/statistics`,
          {
            headers: {
              Authorization: `Bearer ${accessToken || publicAnonKey}`,
            },
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b26bdf05/athletes`,
          {
            headers: {
              Authorization: `Bearer ${accessToken || publicAnonKey}`,
            },
          }
        ),
      ]);

      if (statsResponse.ok && athletesResponse.ok) {
        const statsData = await statsResponse.json();
        const athletesData = await athletesResponse.json();
        setStats(statsData);
        setAthletes(athletesData.athletes || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stateData = stats.stateData || [];
  
  // These would be calculated from real data in production
  const testDistribution = stats.testDistribution || [];
  const monthlyTrend = stats.monthlyTrend || [];

  // Apply filters to athletes
  const filteredAthletes = athletes.filter((athlete: any) => {
    // Search query filter
    if (searchQuery && !athlete.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Age range filter
    if (filters.ageMin && athlete.age < filters.ageMin) return false;
    if (filters.ageMax && athlete.age > filters.ageMax) return false;
    
    // Gender filter
    if (filters.gender && athlete.gender !== filters.gender) return false;
    
    // State filter
    if (filters.state && athlete.state !== filters.state) return false;
    if (selectedState !== "all" && athlete.state?.toLowerCase() !== selectedState) return false;
    
    // Performance score filter
    if (filters.scoreMin && (athlete.performanceScore || 0) < filters.scoreMin) return false;
    if (filters.scoreMax && (athlete.performanceScore || 0) > filters.scoreMax) return false;
    
    return true;
  });

  // Get top athletes sorted by score
  const topAthletes = filteredAthletes
    .filter((a: any) => a.performanceScore > 0)
    .sort((a: any, b: any) => b.performanceScore - a.performanceScore)
    .slice(0, 5)
    .map((athlete: any, index: number) => ({
      id: athlete.id,
      name: athlete.name,
      state: athlete.state || "Unknown",
      score: athlete.performanceScore,
      tests: athlete.testsCompleted,
      rank: index + 1,
    }));

  const handleExportCSV = () => {
    exportAthletesCSV(filteredAthletes);
    toast.success("Athletes data exported successfully!");
  };

  const handleExportPDF = () => {
    const htmlContent = generateAthleteReportHTML(filteredAthletes, stats);
    exportToPDF(htmlContent, `SAI_Report_${new Date().toISOString().split('T')[0]}`);
  };

  const handleApplyFilters = (newFilters: FilterCriteria) => {
    setFilters(newFilters);
    toast.success("Filters applied successfully!");
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-blue-600" />
              <div>
                <h2>SAI Official Dashboard</h2>
                <p className="text-sm text-muted-foreground">Sports Authority of India</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <Button variant="outline" size="sm" onClick={onSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Athletes</CardDescription>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">{stats.totalAthletes.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Registered athletes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Tests Completed</CardDescription>
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">{stats.testsCompleted.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Total assessments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Pending Verification</CardDescription>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">{stats.pendingVerification}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {stats.pendingVerification > 0 ? 'Needs attention' : 'All verified'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Average Score</CardDescription>
                <Trophy className="w-4 h-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">{stats.avgScore || '--'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Overall performance</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="athletes">Athletes</TabsTrigger>
            <TabsTrigger value="regional">Regional Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Growth Trend</CardTitle>
                  <CardDescription>Athletes and tests over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="athletes" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="tests" stroke="#10b981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>Data will appear as athletes complete tests</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Test Distribution</CardTitle>
                  <CardDescription>Number of tests completed by type</CardDescription>
                </CardHeader>
                <CardContent>
                  {testDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={testDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {testDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No test data available yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Athletes */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Athletes</CardTitle>
                <CardDescription>Highest ranked athletes nationwide</CardDescription>
              </CardHeader>
              <CardContent>
                {topAthletes.length > 0 ? (
                  <div className="space-y-4">
                    {topAthletes.map((athlete) => (
                      <div key={athlete.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-blue-600">#{athlete.rank}</span>
                          </div>
                          <div>
                            <h4>{athlete.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{athlete.state}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Score</p>
                            <p className="text-xl">{athlete.score}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Tests</p>
                            <p className="text-xl">{athlete.tests}/6</p>
                          </div>
                          <Button size="sm">View Profile</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No athletes with completed tests yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="athletes" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Athlete Database</CardTitle>
                    <CardDescription>Search and filter athlete records ({filteredAthletes.length} athletes)</CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleExportPDF}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button onClick={handleExportCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6 flex-wrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search athletes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      <SelectItem value="maharashtra">Maharashtra</SelectItem>
                      <SelectItem value="karnataka">Karnataka</SelectItem>
                      <SelectItem value="tamil-nadu">Tamil Nadu</SelectItem>
                    </SelectContent>
                  </Select>
                  <AdvancedFilterDialog 
                    onApplyFilters={handleApplyFilters}
                    currentFilters={filters}
                  />
                </div>

                <div className="space-y-2">
                  {filteredAthletes.slice(0, 10).map((athlete: any) => (
                    <div key={athlete.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4>{athlete.name}</h4>
                          <p className="text-sm text-muted-foreground">{athlete.state || "Unknown"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div>
                          <Badge variant="secondary">Score: {athlete.performanceScore || 0}</Badge>
                        </div>
                        <Button variant="outline" size="sm">View Details</Button>
                      </div>
                    </div>
                  ))}
                  {filteredAthletes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No athletes found matching your criteria</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regional" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>State-wise Performance</CardTitle>
                <CardDescription>Regional participation and average scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={stateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="state" />
                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="athletes" fill="#3b82f6" name="Athletes" />
                    <Bar yAxisId="right" dataKey="avgScore" fill="#10b981" name="Avg Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {stateData.slice(0, 4).map((state) => (
                <Card key={state.state}>
                  <CardHeader>
                    <CardTitle>{state.state}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Athletes Registered</span>
                          <span className="text-xl">{state.athletes.toLocaleString()}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Average Score</span>
                          <span className="text-xl">{state.avgScore}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
