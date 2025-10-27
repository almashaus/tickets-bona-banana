"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  ImageIcon,
  Plus,
  Trash2,
  XIcon,
  CheckIcon,
  UploadIcon,
  Clock4Icon,
  EyeIcon,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { useToast } from "@/src/components/ui/use-toast";
import { useAuth } from "@/src/features/auth/auth-provider";
import { format } from "date-fns";
import { Calendar } from "@/src/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { cityMap, cn, compressImage } from "@/src/lib/utils/utils";
import { City, EventDate, EventStatus } from "@/src/models/event";
import { formatDate } from "@/src/lib/utils/formatDate";
import { getAuth } from "firebase/auth";
import useSWR, { mutate } from "swr";
import { Progress } from "@/src/components/ui/progress";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/src/lib/firebase/firebaseConfig";
import Image from "next/image";

export default function CreateEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const auth = getAuth();
  const authUser = auth.currentUser!;

  interface Response {
    city: {
      ar: string;
      en: string;
    }[];
  }

  const { data, error, isLoading } = useSWR<Response>(
    `/api/admin/settings/city`
  );

  // Initialize state variables with default values
  const [title, setTitle] = useState("");
  const [engTitle, setEngTitle] = useState("");
  const [isEngTitle, setIsEngTitle] = useState(false);
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("Riyadh");
  const [venue, setVenue] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [eventImage, setEventImage] = useState("");
  const [adImage, setAdImage] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<EventStatus>(EventStatus.DRAFT);
  const [isDnd, setisDnd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventDates, setEventDates] = useState<EventDate[]>([
    {
      id: `date${Date.now()}`,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(new Date().setHours(new Date().getHours() + 3)),
      capacity: 20,
      availableTickets: 20,
      eventId: "",
    },
  ]);

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  };

  // Handle title change and auto-generate slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    // Check if the title contains non-English letters
    const isNotEnglish = /[^\u0000-\u007F]+/.test(newTitle);
    setIsEngTitle(isNotEnglish);
    if (!isNotEnglish) {
      setSlug(generateSlug(newTitle));
    }
  };

  // Add new event date
  const addEventDate = () => {
    const newDate: EventDate = {
      id: `date${Date.now()}`,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(new Date().setHours(new Date().getHours() + 3)),
      capacity: 20,
      availableTickets: 20,
      eventId: "",
    };
    setEventDates([...eventDates, newDate]);
  };

  // Remove event date
  const removeEventDate = (id: string) => {
    setEventDates(eventDates.filter((date) => date.id !== id));
  };

  // Update event date
  const updateEventDate = (id: string, field: keyof EventDate, value: any) => {
    setEventDates(
      eventDates.map((date) => {
        if (date.id === id) {
          if (field === "capacity") {
            return { ...date, [field]: value, availableTickets: value };
          }
          return { ...date, [field]: value };
        }
        return date;
      })
    );
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (Number.isNaN(price)) {
      toast({
        title: "Error",
        description: "The price must be number",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const idToken = await authUser.getIdToken();

    const theCity = await cityMap(city);

    try {
      let event = {
        creatorId: user?.id || "1",
        title: title,
        slug: slug,
        description: description,
        eventImage: eventImage,
        adImage: adImage,
        price: parseFloat(price),
        status: status,
        city: theCity,
        venue: venue,
        locationUrl: locationUrl,
        isDnd: isDnd,
        createdAt: new Date(),
        updatedAt: new Date(),
        dates: eventDates,
        id: "",
      };

      console.log(event);
      const response = await fetch("/api/admin/events/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ event: event }),
      });

      if (response.ok) {
        await mutate("/api/admin/events");
        await mutate("/api/published-events");
        await mutate("/api/admin/orders");

        toast({
          title: "Event created",
          description: "Your event has been created successfully",
          variant: "success",
        });

        router.push("/admin/events");
      } else {
        toast({
          title: "Error",
          description: "There was an error creating the event ❗️",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error creating the event ❗️",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Create New Event</h1>
        <Button variant="outline" onClick={() => router.back()}>
          <XIcon className="h-4 w-4 md:me-2" />
          <span className="hidden md:inline">Cancel</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Enter event title"
                  required
                />
              </div>
              {isEngTitle && (
                <div className="grid gap-2">
                  <Label htmlFor="engTitle">
                    Event Title{" "}
                    <span className="text-xs text-redColor">
                      (Only English)
                    </span>
                  </Label>
                  <Input
                    id="engTitle"
                    value={engTitle}
                    onChange={(e) => {
                      const value = e.target.value;
                      const isNotEnglish = /[^\u0000-\u007F]+/.test(value);
                      if (!isNotEnglish) {
                        setEngTitle(value);
                        setSlug(generateSlug(value));
                      }
                    }}
                    placeholder="Enter event title"
                    required
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your event"
                  rows={5}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="price"
                    value={price}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === "") {
                        setPrice("");
                        return;
                      }

                      const numberValue = Number(value);
                      if (!isNaN(numberValue)) {
                        setPrice(value);
                      }
                    }}
                    placeholder="25"
                    className="w-24"
                    required
                  />
                  <span className="text-muted-foreground">SR</span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>

                <Select
                  value={city}
                  onValueChange={(value) => {
                    setCity(value);
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={city} />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.city?.map((c) => (
                      <SelectItem key={c.en} value={c.en}>
                        {c.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="venue">Venue Name</Label>
                <Input
                  id="venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="locationUrl">Location URL</Label>
                <Input
                  id="locationUrl"
                  value={locationUrl}
                  onChange={(e) => setLocationUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as EventStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EventStatus.DRAFT}>
                        <div className="flex items-center">
                          Draft
                          <Clock4Icon className=" w-4 h-4 text-gray-400 mx-1 " />
                        </div>
                      </SelectItem>
                      <SelectItem value={EventStatus.PUBLISHED}>
                        <div className="flex items-center">
                          Published
                          <EyeIcon className=" w-4 h-4 text-blue-400 mx-1 " />
                        </div>
                      </SelectItem>
                      <SelectItem value={EventStatus.CANCELED}>
                        <div className="flex items-center">
                          Canceled
                          <XIcon className=" w-4 h-4 text-red-400 mx-1 " />
                        </div>
                      </SelectItem>
                      <SelectItem value={EventStatus.COMPLETED}>
                        <div className="flex items-center">
                          Completed
                          <CheckIcon className=" w-4 h-4 text-green-400 mx-1 " />
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <Label htmlFor="event-image">Event Image</Label>
                <EventImageInput
                  eventImage={eventImage}
                  setEventImage={setEventImage}
                  slug={slug}
                />
              </div>
              <br />
              <div className="grid gap-4">
                <Label htmlFor="ad-image">Advertisement Image</Label>
                <AdImageInput
                  adImage={adImage}
                  setAdImage={setAdImage}
                  slug={slug}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Dates</CardTitle>
              <CardDescription>
                Add one or more dates for your event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {eventDates.map((eventDate, index) => (
                <div
                  key={eventDate.id}
                  className="space-y-4 pb-4 border-b last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Date {index + 1}</h3>
                    {eventDates.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-500"
                        onClick={() => removeEventDate(eventDate.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1 text-red-500" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-5">
                    <div className="">
                      <Label>Date</Label>
                      <div className="flex flex-col space-y-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal bg-white",
                                !eventDate.date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {eventDate.date ? (
                                formatDate(eventDate.date)
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={eventDate.date}
                              onSelect={(day) => {
                                if (day) {
                                  const newDate = new Date(day);
                                  newDate.setHours(eventDate.date.getHours());
                                  newDate.setMinutes(
                                    eventDate.date.getMinutes()
                                  );
                                  updateEventDate(
                                    eventDate.id,
                                    "date",
                                    newDate
                                  );
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Start Time</Label>
                      <div className="flex space-x-2">
                        <Input
                          type="time"
                          value={format(eventDate.startTime, "HH:mm")}
                          onChange={(e) => {
                            try {
                              const { value } = e.target;

                              if (!value) {
                                return;
                              }

                              const [hours, minutes] = value.split(":");
                              const newDate = new Date(eventDate.date);
                              newDate.setHours(Number(hours));
                              newDate.setMinutes(Number(minutes));

                              updateEventDate(
                                eventDate.id,
                                "startTime",
                                newDate
                              );
                            } catch (_) {}
                          }}
                        />
                      </div>
                      <Label>End Time</Label>
                      <div className="flex flex-col space-y-2">
                        <div className="flex space-x-2">
                          <Input
                            type="time"
                            value={format(eventDate.endTime, "HH:mm")}
                            onChange={(e) => {
                              try {
                                const { value } = e.target;

                                if (!value) {
                                  return;
                                }

                                const [hours, minutes] = value.split(":");
                                const newDate = new Date(eventDate.date);
                                newDate.setHours(Number.parseInt(hours));
                                newDate.setMinutes(Number.parseInt(minutes));
                                updateEventDate(
                                  eventDate.id,
                                  "endTime",
                                  newDate
                                );
                              } catch (_) {}
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 mx-5">
                    <Label htmlFor={`capacity-${eventDate.id}`}>Capacity</Label>
                    <Input
                      id={`capacity-${eventDate.id}`}
                      type="number"
                      min="1"
                      value={eventDate.capacity}
                      onChange={(e) => {
                        updateEventDate(
                          eventDate.id,
                          "capacity",
                          Number.parseInt(e.target.value)
                        );
                        // updateEventDate(
                        //   eventDate.id,
                        //   "availableTickets",
                        //   Number.parseInt(e.target.value)
                        // );
                      }}
                      placeholder="20"
                      className="w-24"
                      required
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                // variant="outline"
                className="w-full text-black/80 bg-muted-foreground/30 hover:bg-muted-foreground/20"
                onClick={addEventDate}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Date
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            <XIcon className="h-4 w-4 me-2" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <CheckIcon className="h-4 w-4 me-2" />{" "}
            {isSubmitting ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function EventImageInput({
  eventImage,
  setEventImage,
  slug,
}: {
  eventImage: string;
  setEventImage: (url: string) => void;
  slug: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    if (file.size > 5 * 1024 * 1024) {
      // compress before uploading
      file = await compressImage(file);
    }

    const objectUrl = URL.createObjectURL(file);
    setEventImage(objectUrl);

    const ext = file.name.split(".").pop();
    const path = `events/${slug}/event_${Date.now()}.${ext}`;

    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type,
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(pct));
      },
      (error) => {
        setUploading(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setEventImage(downloadUrl);
        } finally {
          setUploading(false);
          // free memory for the preview
          URL.revokeObjectURL(objectUrl);
          setProgress(null);
        }
      }
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row items-center gap-2">
        <div>
          <div className="border rounded-md p-1 w-48 h-40 flex flex-col items-center justify-center bg-muted relative">
            {eventImage ? (
              <Image
                src={eventImage || "/no-image.svg"}
                alt="Event"
                className="w-full h-full object-cover rounded-md"
                fill
                priority
                onError={(e) => {
                  e.currentTarget.src = "/no-image.svg";
                }}
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
            <input
              type="file"
              id="event-image-upload"
              accept="image/*"
              className="hidden"
              onChange={handleChange}
            />
            <div className="">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute bottom-1 right-1 h-7 px-2 text-xs"
                onClick={() =>
                  document.getElementById("event-image-upload")?.click()
                }
              >
                <UploadIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {uploading && (
            <Progress value={progress ?? 0} max={100} className="my-1">
              {progress}%
            </Progress>
          )}
        </div>
        <span className="text-orangeColor">Or</span>
        <div className="grid gap-2 w-full">
          <Label>URL</Label>
          <Input
            id="event-image"
            value={
              eventImage.startsWith("https://firebasestorage") ||
              eventImage.startsWith("blob")
                ? ""
                : eventImage
            }
            onChange={(e) => setEventImage(e.target.value)}
            placeholder="Enter image URL"
          />
        </div>
      </div>
    </div>
  );
}

function AdImageInput({
  adImage,
  setAdImage,
  slug,
}: {
  adImage: string;
  setAdImage: (url: string) => void;
  slug: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    if (file.size > 5 * 1024 * 1024) {
      // compress before uploading
      file = await compressImage(file);
    }

    const objectUrl = URL.createObjectURL(file);
    setAdImage(objectUrl);

    const ext = file.name.split(".").pop();
    const path = `events/${slug}/ad_${Date.now()}.${ext}`;

    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type,
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);
    setUploading(true);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(pct));
      },
      (error) => {
        console.error("Upload failed", error);
        setUploading(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setAdImage(downloadUrl);
        } finally {
          setUploading(false);
          // free memory for the preview
          URL.revokeObjectURL(objectUrl);
          setProgress(null);
        }
      }
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row items-center gap-2">
        <div>
          <div className="border rounded-md p-1 w-48 h-40 flex flex-col items-center justify-center bg-muted relative">
            {adImage ? (
              <Image
                src={adImage || "/no-image.svg"}
                alt="Advertisement"
                className="w-full h-full object-cover rounded-md"
                fill
                priority
                onError={(e) => {
                  e.currentTarget.src = "/no-image.svg";
                }}
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
            <input
              type="file"
              id="ad-image-upload"
              accept="image/*"
              className="hidden"
              onChange={handleChange}
            />
            <div className="">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute bottom-1 right-1 h-7 px-2 text-xs"
                onClick={() =>
                  document.getElementById("ad-image-upload")?.click()
                }
              >
                <UploadIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {uploading && (
            <Progress value={progress ?? 0} max={100} className="my-1">
              {progress}%
            </Progress>
          )}
        </div>
        <span className="text-orangeColor">Or</span>
        <div className="grid gap-2 w-full">
          <Label>URL</Label>
          <Input
            id="ad-image"
            value={
              adImage.startsWith("https://firebasestorage") ||
              adImage.startsWith("blob")
                ? ""
                : adImage
            }
            onChange={(e) => setAdImage(e.target.value)}
            placeholder="Enter image URL"
          />
        </div>
      </div>
    </div>
  );
}
