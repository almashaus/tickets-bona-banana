"use client";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { MapPin } from "lucide-react";
import React, { useState } from "react";
import useSWR, { mutate } from "swr";

const SettingsPage = () => {
  interface CityResponse {
    city: {
      ar: string;
      en: string;
    }[];
  }

  const { data: cities } = useSWR<CityResponse>("/api/admin/settings/city");

  const [roles, setRoles] = useState<string[]>([
    "Admin",
    "Organizer",
    "Support",
    "Finance",
    "Partner",
  ]);
  const [newCityEn, setNewCityEn] = useState("");
  const [newCityAr, setNewCityAr] = useState("");
  const [newCityIsAdding, setnewCityIsAdding] = useState(false);
  const [newRole, setNewRole] = useState("");

  // Handlers
  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setnewCityIsAdding(true);
    if (
      newCityEn &&
      !cities?.city.some(
        (cityObj) =>
          cityObj.en.toLowerCase() === newCityEn.toLowerCase() ||
          cityObj.ar === newCityAr
      )
    ) {
      const response = await fetch("/api/admin/settings/city", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ data: { en: newCityEn, ar: newCityAr } }),
      });

      if (response.ok) {
        await mutate("/api/admin/settings/city");
        setNewCityEn("");
        setNewCityAr("");
      }
    }
    setnewCityIsAdding(false);
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRole.trim() && !roles.includes(newRole.trim())) {
      setRoles([...roles, newRole.trim()]);
      setNewRole("");
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Cities Section */}
      <div>
        <h2 className="text-xl font-bold mb-3">Event Settings</h2>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex space-y-0 pb-2">
              <CardTitle className="flex justify-center items-center text-lg font-medium">
                <MapPin className="h-5 w-5 me-1 text-redColor" />
                Event Cities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <form onSubmit={handleAddCity} className="flex flex-col gap-2">
                <Label className="text-md">Add New City</Label>
                <Input
                  type="text"
                  className="border rounded px-3 py-2 flex-1"
                  placeholder="City Name (English)"
                  value={newCityEn}
                  onChange={(e) => setNewCityEn(e.target.value)}
                />
                <Input
                  type="text"
                  className="border rounded px-3 py-2 flex-1 text-right"
                  placeholder="اسم المدينة (عربي)"
                  value={newCityAr}
                  onChange={(e) => setNewCityAr(e.target.value)}
                  disabled={newCityIsAdding}
                />
                <Button type="submit">
                  {newCityIsAdding ? <>...</> : <>Add City</>}
                </Button>
              </form>
              <div>
                {cities?.city.map((city, idx) => (
                  <Badge
                    key={idx}
                    className="text-gray-700 bg-neutral-200 px-3 py-1 me-2 mb-2"
                  >
                    {city.en} {city.ar}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* 
      <Separator />
      <div>
        <h2 className="text-xl font-bold my-3">Members Settings</h2>

    Roles Section 
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center me-1 text-lg font-medium">
                <MonitorCog className="h-5 w-5 me-1 text-redColor" /> Dashboard
                Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRole} className="flex gap-2 my-4">
                <Input
                  type="text"
                  className="border rounded px-3 py-2 flex-1"
                  placeholder="Add new role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                />
                <Button type="submit">Add Role</Button>
              </form>
              <div>
                {roles.map((role, idx) => (
                  <Badge
                    key={idx}
                    className={`${getRoleBadgeColor(role)} px-3 py-1 me-2 mb-2`}
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
       */}
    </div>
  );
};

export default SettingsPage;
