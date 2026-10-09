'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { useMounted } from '@/lib/use-mounted';
import manifest from '../../../../public/images/manifest.json';
import { Button, ButtonLink } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { Input, Textarea, Select, Field } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip } from '@/components/ui/tooltip';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { SideDrawer } from '@/components/ui/drawer';
import { toast } from '@/components/ui/toaster';
import { Skeleton, ProductCardSkeleton, RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Stepper } from '@/components/ui/stepper';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { SizeGrid } from '@/components/ui/size-grid';
import { SwatchGroup } from '@/components/ui/swatch';
import { Carousel } from '@/components/ui/carousel';
import { Price } from '@/components/ui/price';
import { ProductCard } from '@/components/store/product-card';
import { BagIcon, HeartIcon, HomeIcon, ShopIcon, UserIcon, CrestMark } from '@/components/ui/icons';

const img = (k: keyof typeof manifest.products) =>
  manifest.products[k].map((i) => ({ url: i.url, blur: i.blur, alt: null }));

const demo = [
  { slug: 'polo', name: 'Polo blanca manga corta', priceCents: 12000, images: img('polo'), badge: { label: 'Nuevo', tone: 'gold' as const } },
  { slug: 'sweater', name: 'Chompa roja con escudo', priceCents: 22000, images: img('sweater'), colors: ['#b72034', '#292963'] },
  { slug: 'backpack', name: 'Mochila SCCS', priceCents: 38000, compareAtCents: 42000, images: img('backpack') },
  { slug: 'bottle', name: 'Botella de acero Jaguars', priceCents: 12000, images: img('bottle'), badge: { label: 'Agotado', tone: 'subtle' as const } },
  { slug: 'pe-shorts', name: 'Short de deporte rojo', priceCents: 8000, images: img('peShorts') },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-10">
      <h2 className="t-label mb-6 text-ink-2">{title}</h2>
      {children}
    </section>
  );
}

export function DesignShowcase({ qr }: { qr: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [size, setSize] = React.useState<string | null>('8');
  const [qty, setQty] = React.useState(1);
  const [color, setColor] = React.useState('red');
  const [sheet, setSheet] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const [chip, setChip] = React.useState('Primaria');
  const [toggle, setToggle] = React.useState(true);

  return (
    <main className="container-page pb-24">
      <header className="flex flex-wrap items-end justify-between gap-4 py-10">
        <div>
          <p className="t-label text-ink-2">SCCS Store</p>
          <h1 className="t-display mt-3">Design system</h1>
        </div>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <Chip key={t} size="sm" selected={mounted && theme === t} onClick={() => setTheme(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </header>

      <Section title="Color tokens">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {['bg', 'bg-subtle', 'bg-muted', 'ink', 'ink-2', 'line', 'accent', 'accent-soft', 'red', 'gold', 'success', 'warning'].map((c) => (
            <div key={c}>
              <div className="aspect-square rounded-[4px] ring-1 ring-line" style={{ background: `var(--${c})` }} />
              <p className="t-label mt-2 text-ink-2">{c}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-5">
          <p className="t-display">Vuelta a clases</p>
          <p className="t-h1">Kits por nivel</p>
          <p className="t-h2">Complete el uniforme</p>
          <p className="t-title">Polo blanca manga corta</p>
          <p className="t-body max-w-prose text-ink-2">
            Body: Geist at 15px with a 1.5 line height. Calm and readable. Prices use tabular numbers:{' '}
            <Price cents={12000} className="text-ink" />.
          </p>
          <p className="t-caption text-ink-2">Caption: 13px, secondary metadata.</p>
          <p className="t-label">Label · Geist Mono · SKU-POLO-MC-08</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Agregar a la bolsa</Button>
          <Button variant="secondary">Guía de tallas</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Eliminar</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button variant="link">Link</Button>
          <ButtonLink href="/" variant="secondary">
            ButtonLink
          </ButtonLink>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 rounded-[4px] bg-[#1b1b45] p-6">
          <Button variant="inverse">Inverse</Button>
          <Button variant="outlineInverse">Outline inverse</Button>
        </div>
        <div className="mt-4 flex gap-2">
          <IconButton label="Home"><HomeIcon /></IconButton>
          <IconButton label="Shop" variant="subtle"><ShopIcon /></IconButton>
          <IconButton label="Favorite" variant="glass"><HeartIcon filled /></IconButton>
          <IconButton label="Bag" variant="solid"><BagIcon filled /></IconButton>
          <IconButton label="Profile"><UserIcon /></IconButton>
          <CrestMark className="h-11 text-accent" />
        </div>
      </Section>

      <Section title="Badges & chips">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="subtle">Subtle</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="accentSoft">Oficial</Badge>
          <Badge tone="gold">Nuevo</Badge>
          <Badge tone="red">Solo quedan 2</Badge>
          <Badge tone="success">Listo</Badge>
          <Badge tone="warning">Reserva</Badge>
          <Badge tone="outline">Outline</Badge>
        </div>
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {['Inicial', 'Primaria', 'Middle School', 'High School'].map((c) => (
            <Chip key={c} selected={chip === c} onClick={() => setChip(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Product cards & carousel">
        <Carousel ariaLabel="Demo carousel" className="-mx-[var(--gutter)]">
          {demo.map((p, i) => (
            <ProductCard
              key={p.slug}
              priority={i < 2}
              product={{ id: p.slug, ...p }}
              action={
                <IconButton label="Favorito" size="sm">
                  <HeartIcon className="size-5" />
                </IconButton>
              }
            />
          ))}
        </Carousel>
        <div className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-4">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      </Section>

      <Section title="Size grid · swatches · quantity">
        <div className="grid gap-8 md:grid-cols-2">
          <SizeGrid
            name="size"
            legend="Talla"
            value={size}
            onChange={setSize}
            lowStockLabel={(n) => `Solo quedan ${n}`}
            soldOutLabel="Agotado"
            preorderLabel="Reserva"
            savedLabel="Talla guardada de Sofía"
            options={[
              { size: '4', available: 10 },
              { size: '6', available: 0 },
              { size: '8', available: 2, saved: true },
              { size: '10', available: 8 },
              { size: '12', available: 0, preorder: true },
              { size: '14', available: 5 },
              { size: '16', available: 1 },
              { size: 'S', available: 9 },
            ]}
          />
          <div className="space-y-6">
            <SwatchGroup
              legend="Color"
              value={color}
              onChange={setColor}
              options={[
                { value: 'red', label: 'Rojo', hex: '#b72034' },
                { value: 'navy', label: 'Azul marino', hex: '#292963' },
                { value: 'white', label: 'Blanco', hex: '#ffffff' },
              ]}
            />
            <QuantityStepper label="Cantidad" value={qty} onChange={setQty} />
          </div>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-xl gap-5">
          <Field label="Nombre completo" htmlFor="d-name" hint="Como figura en su carnet.">
            <Input placeholder="María Pérez" />
          </Field>
          <Field label="Correo" htmlFor="d-email" error="Ingrese un correo válido">
            <Input defaultValue="maria@" />
          </Field>
          <Field label="Grado" htmlFor="d-grade">
            <Select defaultValue="4">
              <option value="K">Kínder</option>
              <option value="4">4° grado</option>
            </Select>
          </Field>
          <Field label="Notas" htmlFor="d-notes" optional>
            <Textarea placeholder="Recoge la abuela" />
          </Field>
          <Toggle label="Avisos por WhatsApp" description="Pedido listo, pago verificado" checked={toggle} onCheckedChange={setToggle} />
          <Tooltip content="Las tallas se guardan en el perfil del estudiante">
            <Button variant="secondary" className="w-fit">
              Tooltip
            </Button>
          </Tooltip>
        </div>
      </Section>

      <Section title="Sheets, drawer, toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Bottom sheet
          </Button>
          <Button variant="secondary" onClick={() => setDrawer(true)}>
            Side drawer
          </Button>
          <Button variant="secondary" onClick={() => toast('Agregado a la bolsa', { action: { label: 'Ver', onClick: () => {} } })}>
            Toast
          </Button>
          <Button variant="secondary" onClick={() => toast.error('No pudimos guardar')}>
            Error toast
          </Button>
        </div>
        <BottomSheet
          open={sheet}
          onOpenChange={setSheet}
          title="Filtros"
          description="Arrastre hacia abajo para cerrar"
          footer={
            <Button block size="lg" onClick={() => setSheet(false)}>
              Ver 24 productos
            </Button>
          }
        >
          <div className="space-y-3">
            {['Inicial', 'Primaria', 'Middle School', 'High School'].map((g) => (
              <Toggle key={g} label={g} />
            ))}
          </div>
        </BottomSheet>
        <SideDrawer open={drawer} onOpenChange={setDrawer} title="Bolsa" footer={<Button block size="lg">Ir a pagar</Button>}>
          <RowSkeleton rows={3} />
        </SideDrawer>
      </Section>

      <Section title="Accordion">
        <Accordion type="single" collapsible className="max-w-xl">
          <AccordionItem value="d" title="Detalles">Polo piqué 100% algodón con escudo bordado.</AccordionItem>
          <AccordionItem value="m" title="Material y cuidado">Lavar a 30°. No usar cloro.</AccordionItem>
          <AccordionItem value="p" title="Recojo y cambios">15 días para cambiar de talla.</AccordionItem>
        </Accordion>
      </Section>

      <Section title="Stepper · QR">
        <div className="grid gap-10 md:grid-cols-3">
          <Stepper
            current={2}
            steps={[
              { id: 'r', label: 'Recibido', at: '12 ago' },
              { id: 'p', label: 'Pago verificado', at: '12 ago' },
              { id: 'pr', label: 'Preparando' },
              { id: 'rd', label: 'Listo para recoger' },
              { id: 'pu', label: 'Recogido' },
            ]}
          />
          <Stepper
            orientation="horizontal"
            current={1}
            steps={[
              { id: '1', label: 'Recojo' },
              { id: '2', label: 'Pago' },
              { id: '3', label: 'Confirmar' },
            ]}
          />
          {qr}
        </div>
      </Section>

      <Section title="Skeleton · empty state">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-40 w-full" />
          </div>
          <EmptyState
            icon={<BagIcon className="size-7" />}
            title="Su bolsa está vacía"
            description="Cuando agregue productos, aparecerán aquí."
            action={<Button>Empezar a comprar</Button>}
          />
        </div>
      </Section>
    </main>
  );
}
