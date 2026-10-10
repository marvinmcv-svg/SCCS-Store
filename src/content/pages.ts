/**
 * Static page copy (es/en). Plain data so the school can edit wording
 * without touching components. Items marked PLACEHOLDER need confirmation.
 */
type Block = { h?: string; p?: string[]; list?: string[]; qa?: { q: string; a: string }[] };
export type StaticPage = { title: string; intro: string; blocks: Block[] };
type Vars = { exchangeDays: number; holdDays: number; location: string; email: string; phone: string; whatsapp: string; address: string; hours: string };

export const PAGE_SLUGS = ['about', 'uniform-policy', 'size-guide', 'faq', 'contact', 'terms', 'privacy'] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export function getPage(slug: PageSlug, locale: string, v: Vars): StaticPage {
  const es = locale !== 'en';
  switch (slug) {
    case 'about':
      return es
        ? {
            title: 'Sobre la tienda',
            intro: 'SCCS Store es la tienda oficial de Santa Cruz Cooperative School. Uniformes, mochilas y recuerdos Jaguar, con recojo en el colegio.',
            blocks: [
              { h: 'Por qué existe', p: ['Queremos que comprar el uniforme sea rápido y sin errores: tallas guardadas por estudiante, kits por nivel y un horario de recojo que se adapta a su rutina.'] },
              { h: 'Cómo funciona', list: ['Elija productos o un kit para su nivel.', 'Pague con QR bancario y envíenos el comprobante por WhatsApp.', 'Elija un horario de recojo y presente su código QR.'] },
              { h: 'Desde 1959', p: ['Santa Cruz Cooperative School fue fundado en 1959 y hoy es el hogar de cientos de Jaguars. Todo lo recaudado apoya a nuestra comunidad educativa.'] },
            ],
          }
        : {
            title: 'About the store',
            intro: 'SCCS Store is the official store of Santa Cruz Cooperative School. Uniforms, bags and Jaguar souvenirs, with pickup at school.',
            blocks: [
              { h: 'Why it exists', p: ['We want buying the uniform to be fast and mistake-free: saved sizes per student, grade kits and a pickup time that fits your routine.'] },
              { h: 'How it works', list: ['Choose products or a kit for your grade.', 'Pay by bank QR and send us the receipt on WhatsApp.', 'Pick a pickup time and show your QR code.'] },
              { h: 'Since 1959', p: ['Santa Cruz Cooperative School was founded in 1959 and is home to hundreds of Jaguars. Proceeds support our learning community.'] },
            ],
          };
    case 'uniform-policy':
      return es
        ? {
            title: 'Política de uniforme',
            intro: 'Resumen de la política publicada por el colegio en sccs.edu.bo. Ante cualquier duda, prevalece el reglamento oficial.',
            blocks: [
              { h: 'Uniforme diario', list: ['Polo blanca con cuello de 3–4 botones, sin diseño a excepción del logo del colegio.', 'Bermuda o pantalón khaki sin bordado ni diseño. No se permiten overoles ni faldas.', 'Zapatos deportivos para niños y niñas. No se permiten sandalias, chinelas ni crocs.'] },
              { h: 'Para el frío', list: ['Chompa roja o chamarra roja.'] },
              { h: 'Educación Física', list: ['Polera blanca lisa.', 'Short rojo (o "jaguar") y zapatos deportivos.', 'Buzo deportivo rojo para días fríos.'] },
              { h: 'Recomendación', p: ['Marque todas las prendas con el nombre de su hijo o hija.'] },
            ],
          }
        : {
            title: 'Uniform policy',
            intro: 'Summary of the policy published by the school at sccs.edu.bo. The official handbook prevails.',
            blocks: [
              { h: 'Daily uniform', list: ['White polo with a 3–4 button collar, no design except the school logo.', 'Khaki bermuda shorts or trousers without embroidery or designs. No overalls or skirts.', 'Flat tennis shoes for boys and girls. No sandals, flip-flops or Crocs.'] },
              { h: 'Cold weather', list: ['Red sweater or red jacket.'] },
              { h: 'Physical Education', list: ['Plain white T-shirt.', 'Red (or "jaguar") shorts and athletic shoes.', 'Red sweat suit for cold days.'] },
              { h: 'Tip', p: ["Label every garment with your child's name."] },
            ],
          };
    case 'size-guide':
      return es
        ? {
            title: 'Guía de tallas',
            intro: 'Medidas de referencia para polos, chompas y chamarras. En la página de cada producto encontrará el asistente de tallas.',
            blocks: [{ h: 'Consejo', p: ['Si su hijo o hija está entre dos tallas, elija la mayor: los uniformes se usan todo el año.', 'Las tallas que compre para cada estudiante quedan guardadas en su perfil.'] }],
          }
        : {
            title: 'Size guide',
            intro: 'Reference measurements for polos, sweaters and jackets. Every product page also has a size helper.',
            blocks: [{ h: 'Tip', p: ['If your child is between sizes, choose the larger one: uniforms are worn all year.', 'Sizes you buy for each student are saved on their profile.'] }],
          };
    case 'faq':
      return {
        title: es ? 'Preguntas frecuentes' : 'FAQ',
        intro: es ? 'Lo que las familias nos preguntan más seguido.' : 'What families ask us most.',
        blocks: [
          {
            qa: es
              ? [
                  { q: '¿Hacen envíos?', a: `No. Todos los pedidos se recogen en ${v.location}, en el horario que elija al pagar.` },
                  { q: '¿Cómo pago?', a: 'Solo con QR bancario. Al confirmar el pedido verá el QR; pague desde la app de su banco y envíenos el pedido con la captura del comprobante por WhatsApp.' },
                  { q: '¿Cuánto tarda la verificación del pago?', a: 'Revisamos los comprobantes en horario escolar, normalmente el mismo día. Le avisamos por WhatsApp y correo.' },
                  { q: '¿Puedo cambiar una talla?', a: `Sí, dentro de ${v.exchangeDays} días desde el recojo, con la prenda sin uso y con etiqueta. Solicítelo desde su pedido.` },
                  { q: '¿Puede recoger otra persona?', a: 'Sí. Indique su nombre al pagar y que presente el código QR del pedido.' },
                  { q: '¿Qué es una reserva?', a: 'Si una talla está agotada y el producto lo permite, puede reservarla. Le avisaremos cuando llegue.' },
                ]
              : [
                  { q: 'Do you ship?', a: `No. All orders are collected at the ${v.location}, at the time you choose at checkout.` },
                  { q: 'How do I pay?', a: 'By bank QR only. After you confirm your order you see the QR; pay from your banking app and send us the order with a screenshot of the receipt on WhatsApp.' },
                  { q: 'How long does payment verification take?', a: "We review receipts during school hours, usually the same day. We'll notify you by WhatsApp and email." },
                  { q: 'Can I exchange a size?', a: `Yes, within ${v.exchangeDays} days of pickup, unworn and with tags. Request it from your order.` },
                  { q: 'Can someone else pick up?', a: 'Yes. Enter their name at checkout and have them show the order QR code.' },
                  { q: 'What is a pre-order?', a: "If a size is sold out and the product allows it, you can reserve it. We'll tell you when it arrives." },
                ],
          },
        ],
      };
    case 'contact':
      return es
        ? {
            title: 'Contacto',
            intro: '¿Dudas sobre tallas, pagos o su pedido? Estamos para ayudarle.',
            blocks: [
              { h: 'Tienda', list: [`WhatsApp: +${v.whatsapp}`, `Correo: ${v.email}`, `Horario: ${v.hours}`, `Recojo: ${v.location}`] },
              { h: 'Colegio', list: [`Teléfono: ${v.phone}`, `Dirección: ${v.address}`] },
            ],
          }
        : {
            title: 'Contact',
            intro: 'Questions about sizes, payments or your order? We’re here to help.',
            blocks: [
              { h: 'Store', list: [`WhatsApp: +${v.whatsapp}`, `Email: ${v.email}`, `Hours: ${v.hours}`, `Pickup: ${v.location}`] },
              { h: 'School', list: [`Phone: ${v.phone}`, `Address: ${v.address}`] },
            ],
          };
    case 'terms':
      return es
        ? {
            title: 'Términos y condiciones',
            intro: 'Al comprar en SCCS Store acepta estas condiciones. (Borrador: debe ser revisado por el colegio.)',
            blocks: [
              { h: 'Pedidos', p: ['Un pedido se confirma al recibirlo. La disponibilidad se garantiza al confirmar; durante el pago reservamos el stock por 15 minutos.'] },
              { h: 'Precios y pagos', p: ['Precios en bolivianos (Bs), con impuestos incluidos. Los pagos se realizan solo por QR bancario y se verifican manualmente con el comprobante enviado por WhatsApp.'] },
              { h: 'Recojo', p: [`Los pedidos se entregan en ${v.location} contra presentación del código QR.`] },
              { h: 'Cambios', p: [`Cambios de talla dentro de ${v.exchangeDays} días desde el recojo, con la prenda sin uso y con etiqueta. Productos con falla se cambian siempre.`] },
            ],
          }
        : {
            title: 'Terms & conditions',
            intro: 'By ordering from SCCS Store you accept these terms. (Draft: to be reviewed by the school.)',
            blocks: [
              { h: 'Orders', p: ['An order is confirmed once received. Availability is guaranteed at confirmation; during checkout we hold stock for 15 minutes.'] },
              { h: 'Prices & payment', p: ['Prices in bolivianos (Bs), taxes included. Payment is by bank QR only and is verified manually from the receipt sent on WhatsApp.'] },
              { h: 'Pickup', p: [`Orders are handed over at the ${v.location} on presentation of the QR code.`] },
              { h: 'Exchanges', p: [`Size exchanges within ${v.exchangeDays} days of pickup, unworn and with tags. Defective items are always exchanged.`] },
            ],
          };
    case 'privacy':
      return es
        ? {
            title: 'Política de privacidad',
            intro: 'Los estudiantes son menores de edad. Por eso recolectamos lo mínimo y nunca vendemos datos. (Borrador: debe ser revisado por el colegio.)',
            blocks: [
              { h: 'Qué guardamos', list: ['De madres, padres y tutores: nombre, correo, celular e historial de pedidos.', 'De estudiantes: solo nombre de pila, grado, sección, corte preferido y tallas.', 'Comprobantes de pago, guardados de forma privada y visibles solo para el personal autorizado.'] },
              { h: 'Qué no hacemos', list: ['No pedimos fotos, apellidos ni fecha de nacimiento de estudiantes.', 'No usamos publicidad ni rastreo de terceros. Las estadísticas son anónimas y agregadas.', 'No vendemos ni compartimos datos.'] },
              { h: 'Sus derechos', p: [`Puede ver, corregir o eliminar los perfiles de sus hijos en cualquier momento desde su cuenta, o escribirnos a ${v.email}.`] },
            ],
          }
        : {
            title: 'Privacy policy',
            intro: 'Students are minors, so we collect the minimum and never sell data. (Draft: to be reviewed by the school.)',
            blocks: [
              { h: 'What we store', list: ['Parents and guardians: name, email, mobile and order history.', 'Students: first name, grade, section, preferred fit and sizes only.', 'Payment receipts, stored privately and visible only to authorised staff.'] },
              { h: 'What we never do', list: ['We never ask for student photos, surnames or birthdates.', 'No third-party advertising or tracking. Analytics are anonymous and aggregated.', 'We never sell or share data.'] },
              { h: 'Your rights', p: [`You can view, correct or delete your children's profiles any time from your account, or email ${v.email}.`] },
            ],
          };
  }
}
