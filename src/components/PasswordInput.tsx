import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  showDisclaimer?: boolean;
}

const PasswordInput = ({
  className,
  showDisclaimer = false,
  ...props
}: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          className={cn("pr-12", className)}
          {...props}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full w-11 px-3 transition-colors duration-200 ease-in-out"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Hide password" : "Show password"}
            >
              {visible ? (
                <EyeOff className="h-4 w-4 text-primary transition-colors duration-200" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground transition-colors duration-200" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {visible ? "Hide password" : "Show password"}
          </TooltipContent>
        </Tooltip>
      </div>
      {showDisclaimer && (
        <p className="text-xs text-muted-foreground">
          🔒 Your password is encrypted and secure
        </p>
      )}
    </div>
  );
};

export default PasswordInput;
