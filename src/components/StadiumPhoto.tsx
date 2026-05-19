import { useVenueImage } from "@/hooks/useVenueImage";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";

interface StadiumPhotoProps {
  venue: string;
}

export function StadiumPhoto({ venue }: StadiumPhotoProps) {
  const { data, isLoading, isError } = useVenueImage(venue);

  return (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted">
      {isLoading && <Skeleton className="absolute inset-0" />}

      {!isLoading && (isError || !data) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
          <p className="text-sm">📷 Geen foto beschikbaar</p>
          <p className="text-[10px] mt-1">{venue}</p>
        </div>
      )}

      {data && (
        <>
          <img
            src={data.original}
            srcSet={`${data.thumbnail} 800w, ${data.original} 1600w`}
            sizes="(max-width: 768px) 100vw, 800px"
            alt={data.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
          <div className="absolute top-3 left-3 text-xs px-2.5 py-1 rounded-md bg-black/55 text-white backdrop-blur-sm font-medium">
            📍 {venue}
          </div>
          <a
            href={data.articleUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] text-white/90 px-2 py-1 rounded-md bg-black/45 backdrop-blur-sm hover:bg-black/70 transition-colors"
            title="Foto en informatie via Wikipedia"
          >
            Foto via Wikipedia
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </>
      )}
    </div>
  );
}
