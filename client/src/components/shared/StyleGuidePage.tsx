import React from 'react';
import { Page } from '@/components/Page';
import { MetricCard } from './MetricCard';
import { EmptyState } from './EmptyState';
import { TableToolbar } from './TableToolbar';
import { ModalFooter } from './ModalFooter';
import { AgentCard } from './AgentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';

/**
 * Dev-only Live Style Guide component.
 * Demonstrates composed design system blocks, semantic theme tokens, and typography.
 */
export const StyleGuidePage: React.FC = () => {
  return (
    <Page>
      <Page.Header>
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title>Design System Style Guide</Page.Title>
            <Page.Description>
              Canonical showcase of unified L1 and L2 primitives, layout blocks, and theme tokens.
            </Page.Description>
          </Page.TitleGroup>
          <Page.Actions>
            <Button variant="outline" size="sm">
              Secondary
            </Button>
            <Button size="sm">
              Primary Action
            </Button>
          </Page.Actions>
        </Page.HeaderRow>
      </Page.Header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">ElevenLabs Conversational AI Agents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AgentCard
            name="Customer Support Concierge"
            description="Autonomous tier-1 support agent handling ticketing, account verification, and status lookups."
            voice="Rachel (Expressive)"
            status="active"
            lastEdited="2m ago"
            conversationCount={1420}
            isStreaming={true}
          />
          <AgentCard
            name="Outbound Lead Qualification"
            description="Inbound inquiry triage and scheduling assistant connected to calendar and CRM pipelines."
            voice="Adam (Natural)"
            status="active"
            lastEdited="1h ago"
            conversationCount={580}
          />
          <AgentCard
            name="IT Diagnostics Bot"
            description="Network troubleshooting bot for automated device health checks and telemetry diagnostics."
            voice="Antoni (Technical)"
            status="draft"
            lastEdited="3d ago"
            conversationCount={12}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Composed Metric Cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Total Revenue"
            value="$45,231.89"
            description="+20.1% from last month"
            trend={{ value: "+20.1%", isPositive: true }}
          />
          <MetricCard
            title="Active Subscriptions"
            value="124"
            description="+12 new this week"
            trend={{ value: "+10.5%", isPositive: true }}
          />
          <MetricCard
            title="Open Tickets"
            value="12"
            description="3 critical SLA tickets"
            trend={{ value: "-4.2%", isPositive: false }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Table Toolbar & Empty States</h2>
        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle>Data Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TableToolbar
              searchValue=""
              onSearchChange={() => {}}
              searchPlaceholder="Filter items..."
              actions={<Button size="sm" variant="outline">Export CSV</Button>}
            />
            <EmptyState
              title="No records found"
              description="There are currently no active records matching your filter criteria."
              action={{ label: "Create Record", onClick: () => {} }}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Modal Footers</h2>
        <Card className="bg-card text-card-foreground p-4">
          <ModalFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </ModalFooter>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">ElevenLabs Floating & Interactive Primitives</h2>
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card text-card-foreground p-5 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Toggles & Controls</h3>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-foreground">Streaming WebRTC Audio</div>
                  <div className="text-[11px] text-muted-foreground">Low-latency bidirectional audio streaming</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-foreground">Zero Retention Telemetry</div>
                  <div className="text-[11px] text-muted-foreground">Do not persist conversation logs on server</div>
                </div>
                <Switch />
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Agent Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start">
                    <DropdownMenuLabel>Conversation</DropdownMenuLabel>
                    <DropdownMenuItem>
                      Export Transcript
                      <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Duplicate Agent
                      <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">
                      Delete Agent
                      <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="secondary" size="sm">
                      Voice Parameters
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <PopoverHeader>
                      <PopoverTitle>Voice Settings</PopoverTitle>
                      <PopoverDescription>
                        Adjust ElevenLabs latency vs stability presets.
                      </PopoverDescription>
                    </PopoverHeader>
                    <div className="space-y-2 pt-1 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Stability</span>
                        <span className="font-mono text-foreground">0.75</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Similarity Boost</span>
                        <span className="font-mono text-foreground">0.85</span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Inspect Latency
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Average roundtrip: ~320ms over WebRTC
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>

            <Card className="bg-card text-card-foreground p-5 space-y-3">
              <h3 className="text-sm font-medium text-foreground">Spotlight Command Palette</h3>
              <div className="rounded-xl border border-border/80 bg-popover/90 backdrop-blur-md overflow-hidden shadow-lg">
                <Command>
                  <CommandInput placeholder="Search knowledge base and tools..." />
                  <CommandList className="max-h-44">
                    <CommandEmpty>No matching knowledge documents.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                      <CommandItem>
                        <span>Customer Help Center FAQs</span>
                        <CommandShortcut>↵</CommandShortcut>
                      </CommandItem>
                      <CommandItem>
                        <span>CRM Contact Lookup Tool</span>
                        <CommandShortcut>⌘K</CommandShortcut>
                      </CommandItem>
                      <CommandItem>
                        <span>Zabbix RMM Telemetry Sensor</span>
                        <CommandShortcut>⌘R</CommandShortcut>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </Card>
          </div>
        </TooltipProvider>
      </section>
    </Page>
  );
};
