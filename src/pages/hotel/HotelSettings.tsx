import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useHotelInfo, useUpdateHotelInfo } from "@/hooks/useHotel";
import { Building, Receipt, Bell, Users, DollarSign, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function HotelSettings() {
  const { data: hotelInfo, isLoading } = useHotelInfo();
  const updateHotelInfo = useUpdateHotelInfo();

  const [hotelData, setHotelData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    tax_rate: 18,
    cancellation_policy: "",
    logo_url: "",
  });

  const [notifications, setNotifications] = useState({
    emailBookingConfirmation: true,
    emailCheckoutReminder: true,
    smsBookingConfirmation: false,
    smsCheckoutReminder: false,
  });

  useEffect(() => {
    if (hotelInfo) {
      setHotelData({
        name: hotelInfo.name || "",
        address: hotelInfo.address || "",
        phone: hotelInfo.phone || "",
        email: hotelInfo.email || "",
        tax_rate: hotelInfo.tax_rate || 18,
        cancellation_policy: hotelInfo.cancellation_policy || "",
        logo_url: hotelInfo.logo_url || "",
      });
    }
  }, [hotelInfo]);

  const handleSaveHotelInfo = async () => {
    try {
      if (hotelInfo?.id) {
        await updateHotelInfo.mutateAsync({ id: hotelInfo.id, ...hotelData });
        toast.success("Hotel information updated");
      }
    } catch (error) {
      toast.error("Failed to update hotel information");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Hotel Settings</h1>
          <p className="text-muted-foreground">Configure your hotel system preferences</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Hotel Information</CardTitle>
                <CardDescription>Basic information about your hotel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hotel Name</Label>
                    <Input
                      value={hotelData.name}
                      onChange={(e) => setHotelData({ ...hotelData, name: e.target.value })}
                      placeholder="Grand Hotel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={hotelData.email}
                      onChange={(e) => setHotelData({ ...hotelData, email: e.target.value })}
                      placeholder="contact@hotel.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={hotelData.phone}
                      onChange={(e) => setHotelData({ ...hotelData, phone: e.target.value })}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={hotelData.logo_url}
                      onChange={(e) => setHotelData({ ...hotelData, logo_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={hotelData.address}
                    onChange={(e) => setHotelData({ ...hotelData, address: e.target.value })}
                    placeholder="123 Hotel Street, City, Country"
                    rows={2}
                  />
                </div>
                <Button onClick={handleSaveHotelInfo} disabled={updateHotelInfo.isPending}>
                  {updateHotelInfo.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Tax Settings</CardTitle>
                <CardDescription>Configure tax rates and billing preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      value={hotelData.tax_rate}
                      onChange={(e) => setHotelData({ ...hotelData, tax_rate: Number(e.target.value) })}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cancellation Policy</Label>
                  <Textarea
                    value={hotelData.cancellation_policy}
                    onChange={(e) => setHotelData({ ...hotelData, cancellation_policy: e.target.value })}
                    placeholder="Free cancellation up to 24 hours before check-in..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleSaveHotelInfo} disabled={updateHotelInfo.isPending}>
                  {updateHotelInfo.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Room Pricing Rules</CardTitle>
                <CardDescription>Configure seasonal rates and pricing modifiers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-4">Default Room Prices</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Single Room</Label>
                      <Input type="number" defaultValue={50} />
                    </div>
                    <div className="space-y-2">
                      <Label>Double Room</Label>
                      <Input type="number" defaultValue={80} />
                    </div>
                    <div className="space-y-2">
                      <Label>Suite</Label>
                      <Input type="number" defaultValue={150} />
                    </div>
                    <div className="space-y-2">
                      <Label>Deluxe</Label>
                      <Input type="number" defaultValue={200} />
                    </div>
                    <div className="space-y-2">
                      <Label>Presidential</Label>
                      <Input type="number" defaultValue={500} />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-4">Seasonal Modifiers</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Peak Season (Dec-Jan)</p>
                        <p className="text-sm text-muted-foreground">+25% price modifier</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Off Season (Mar-May)</p>
                        <p className="text-sm text-muted-foreground">-15% price modifier</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Weekend Premium</p>
                        <p className="text-sm text-muted-foreground">+10% on Fri-Sun</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Pricing Rules
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure email and SMS notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-medium">Email Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Booking Confirmation</p>
                        <p className="text-sm text-muted-foreground">Send email when booking is confirmed</p>
                      </div>
                      <Switch
                        checked={notifications.emailBookingConfirmation}
                        onCheckedChange={(checked) => 
                          setNotifications({ ...notifications, emailBookingConfirmation: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Checkout Reminder</p>
                        <p className="text-sm text-muted-foreground">Send reminder before checkout time</p>
                      </div>
                      <Switch
                        checked={notifications.emailCheckoutReminder}
                        onCheckedChange={(checked) => 
                          setNotifications({ ...notifications, emailCheckoutReminder: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium">SMS Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Booking Confirmation</p>
                        <p className="text-sm text-muted-foreground">Send SMS when booking is confirmed</p>
                      </div>
                      <Switch
                        checked={notifications.smsBookingConfirmation}
                        onCheckedChange={(checked) => 
                          setNotifications({ ...notifications, smsBookingConfirmation: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Checkout Reminder</p>
                        <p className="text-sm text-muted-foreground">Send SMS reminder before checkout</p>
                      </div>
                      <Switch
                        checked={notifications.smsCheckoutReminder}
                        onCheckedChange={(checked) => 
                          setNotifications({ ...notifications, smsCheckoutReminder: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle>User Roles & Permissions</CardTitle>
                <CardDescription>Configure staff access levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {[
                    { role: "Manager", permissions: ["All access", "Reports", "Settings", "Staff management"] },
                    { role: "Receptionist", permissions: ["Bookings", "Check-in/out", "Guests", "Invoices"] },
                    { role: "Housekeeping", permissions: ["Room status", "Cleaning tasks", "Maintenance requests"] },
                    { role: "Security", permissions: ["Guest logs", "Access control", "Incident reports"] },
                    { role: "Maintenance", permissions: ["Work orders", "Room repairs", "Equipment logs"] },
                  ].map((item) => (
                    <div key={item.role} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{item.role}</h4>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.permissions.map((perm) => (
                          <span key={perm} className="px-2 py-1 bg-muted rounded-md text-xs">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
