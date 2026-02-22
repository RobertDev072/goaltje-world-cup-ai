import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <p className="text-6xl">⚽</p>
        <h1 className="text-4xl font-bold font-display">404</h1>
        <p className="text-lg text-muted-foreground">Oeps! Deze pagina bestaat niet.</p>
        <Link to="/">
          <Button className="gradient-primary text-primary-foreground gap-2 mt-2">
            <Home className="h-4 w-4" /> Terug naar home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
