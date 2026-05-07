import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listBookings, listBusinesses } from "@/lib/api";

export default function CustomerSaved() {
  const { user } = useAuth();
  if (!user) return null;
  const myBookings = listBookings({ customerUserId: user.id });
  const everBooked = new Set(myBookings.map((b) => b.businessId));
  const businesses = listBusinesses().filter((b) => everBooked.has(b.id));

  return (
    <div>
      <h1 className="text-title1 font-semibold tracking-tight">Saved</h1>
      <p className="text-muted-foreground mt-1 mb-6">Quick rebook — businesses you've used before.</p>
      {businesses.length === 0 ? (
        <Card className="p-10 text-center">
          <Heart className="h-7 w-7 mx-auto text-primary mb-3" />
          <h3 className="font-semibold">Nothing saved yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">After your first booking, businesses show up here for one-tap rebooking.</p>
          <Button asChild><Link to="/me/discover">Discover businesses</Link></Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((b) => (
            <Card key={b.id} className="overflow-hidden hover:shadow-pillow transition-all">
              {b.heroImage && <div className="aspect-[5/3] bg-muted overflow-hidden"><img src={b.heroImage} alt="" className="w-full h-full object-cover" loading="lazy" /></div>}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-headline">{b.name}</h3>
                  <Badge variant="muted">{b.tier}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{b.description}</p>
                <Button asChild size="sm" className="w-full mt-4"><Link to={`/b/${b.slug}`}>Book again</Link></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
