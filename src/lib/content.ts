import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * 站点内容（About / Terms）
 *
 * - 后台 /admin/content 编辑，前台 /about /terms 渲染
 * - 读库失败或内容为空时回落到内置英文默认文案，保证页面不 500
 * - 缓存 tag: `page-${key}`，保存后由 savePage 触发失效
 */

export const CONTENT_KEYS = ["about", "terms"] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];

export function isContentKey(value: string | null | undefined): value is ContentKey {
  return value === "about" || value === "terms";
}

export const DEFAULT_ABOUT = `MROBOM supplies production MRO (Maintenance, Repair & Operations) and BOM (Bill of Materials) materials to customers worldwide, together with a broad portfolio of service solutions.

MROBOM empowers product design through innovation and technology, helping customers increase capacity, shorten lead times and reduce procurement costs, and optimising inventory management across maintenance, repair and operations. Alongside full-lifecycle product support, we deliver customised product and service solutions that help customers achieve both cost efficiency and business growth.

Goods are sourced from factories, authorised channels and confirmed stock; alternative, equivalent or refurbished items are stated on the quotation.

Quotations verify part numbers against the manufacturer datasheet, and every shipment is accompanied by a commercial invoice, packing list and the required certificates.

## Transactions and Statements

- Self-service ordering is supported for products marked as "self" in the order; manual quotation is also available.
- Time standard: GMT+8. Enquiries are answered within one business day.
- The site is intended for businesses, institutions and commercial buyers only.
- MROBOM is an independent product distributor; trademarks belong to their respective owners.

## Supply Scope

### Electrical

Switching power supplies, DIN-rail power supplies, isolation and control transformers, UPS, circuit breakers, fuses, surge protectors, contactors, solid-state relays, terminal blocks, DIN rail, connectors, industrial cable, drag-chain cable, heat-shrink tubing, distribution boxes, pushbuttons and indicator lights, cabinet fans and air conditioners, explosion-proof electrical equipment.

### Mechanical

Bearings, bearing housings, ball screws, guide shafts, linear guides, sliders, linear modules, electric cylinders, timing belts and pulleys, chains and sprockets, couplings, O-rings, oil seals, gaskets, fasteners, springs and shock absorbers, aluminium profiles, castors, mould standard parts.

### Control

PLC programmable controllers, CPU and I/O expansion modules, HMI panels, industrial touch screens, industrial PCs, temperature controllers, PID controllers, counters, safety relays, emergency-stop and safety-door modules, Modbus/Profinet/EtherNet-IP gateways, signal isolation transmitters, safety light-curtain controllers.

### Sensors

Inductive and capacitive proximity sensors, photoelectric and laser sensors, pressure switches, vacuum, flow and level sensors, thermocouples, RTDs, temperature probes, displacement and angle sensors, incremental and absolute encoders, vision sensors, smart cameras, code readers, RFID, ultrasonic and colour sensors.

### Drives

Servo motors and servo drives, stepper motors and drivers, VFDs, soft starters, three-phase and single-phase induction motors, geared motors, gear motors, electric actuators, electric cylinders, motor brakes, cooling accessories.

### Fluid

Pneumatic cylinders, pneumatic grippers, rotary actuators, solenoid valves, air-pilot valves, valve islands, FRL units, pneumatic fittings, PU tubing, silencers, vacuum generators, suction cups, hydraulic cylinders, hydraulic valves, hydraulic fittings, high-pressure hoses, pumps, flow meters, fluid filters.

### CNC & Robotics

CNC system panels, servo drives, I/O expansion, CNC operator units, turrets, tool magazines, spindle parts; six-axis articulated robots, SCARA robots, collaborative robots (COBOT), Delta parallel robots, gantry and Cartesian robots, AMR/AGV mobile robots, industrial UAVs, machine-vision cameras and light sources, robot cable packages, grippers and quick-change tooling, 3D printer filaments.

### Building Systems

DDC controllers, BACnet and KNX gateways, VAV and fan-coil controllers, temperature/humidity and differential-pressure sensors, CO₂ sensors, damper and motorised valve actuators; smart luminaires, DALI gateways, dimming modules, emergency lighting; access controllers, card readers, electromagnetic locks, fire-linkage modules; building switches, IoT gateways, bus cables, cable trays.

### Instruments & Tools

Multimeters, oscilloscopes, callipers, micrometers, height gauges, vibration meters, force gauges, temperature and pressure calibrators, hand and power tools, pneumatic tools, torque tools, drill bits, taps, milling cutters, oil stones, grinding wheels and sandpaper, fixtures and tool holders.

### Lab Supplies

Laboratory measuring instruments, environmental test chambers, temperature and humidity recorders, test reagents, sampling containers, beakers, filtration consumables, anti-static laboratory utensils, gas detectors, water-quality testing accessories.

### Custom & Services

Machined parts to drawing (turning, milling, grinding, sheet metal), non-standard fasteners, non-standard mould parts, wiring harnesses and cable assemblies, production-BOM kitting, discontinued-part alternative selection, special-specification sourcing, technical consultation and documentation support.

## Industry-Specific Products

### Cement Industry

Wear-resistant castings and liners, rotary-kiln tyres, support rollers and girth gears, ball-mill grinding balls and cylpebs, elevator buckets and plate chains, conveyor idlers and pulleys, dust-collector filter bags and cages, high-temperature butterfly valves and slide gates, wear-resistant pipes and compensators, high-temperature thermocouples, refractory and insulation materials, laminated PP woven bags.

### Electronics & Semiconductor

SMT nozzles, placement-machine guide rails, drive belts, cutting blades, ceramic nozzles, probes, test sockets, carriers and fixtures, cleanroom wipes and anti-static gloves, solder paste, flux, soldering tips, thermodes, release films, FFU fan filter units, differential-pressure sensors, precision grippers.

### Automotive Manufacturing

Welding-gun electrode tips, contact tips, welding-clamp cables, safety light curtains, stamping-die springs and punches, stripper bolts, paint-robot spare parts, electrostatic spray-gun parts, tightening-spindle assemblies, torque tools, conveyor chains, roller-bed spare parts, stopper cylinders, robot cable packages and reducers.

### Lithium-Battery

Coating and calendering rollers, slitting knife rollers and blades, ceramic rollers, winding needles, press rollers, separator fixtures, vacuum suction assemblies, injection sealing valves, corrosion-resistant piping, PACK hot-press heads and fixtures, cell fixtures, explosion-proof and corrosion-resistant sensors, Delta sorting spare parts.

### Photovoltaic / PV

Diamond wire saws, cutting rollers, ceramic fixtures, diffusion-furnace and PECVD furnace tubes, quartz parts, corrosion-resistant seals, stringer soldering heads, EVA cutting blades, lamination silicone pads, vacuum suction cups and generators, EL inspection cameras, high-temperature conveyor belts.

### Food & Pharmaceutical

Stainless-steel sanitary valves and quick-connect fittings, silicone seals, food-grade hoses and conveyor belts, mesh belts, sanitary bearings, filling valves, labelling-machine rollers, heat-sealing strips, CIP cleaning balls, sanitary filters, sanitary pressure and temperature sensors, GMP cleanroom consumables.

### Steel & Metallurgy

Heat-resistant castings, tuyère sleeves, cooling walls, high-temperature compensators, rolling rolls, bearing housings, guides, wear-resistant liners, hydraulic servo valves, high-temperature butterfly valves, metal expansion joints, dust-collector filter bags, high-temperature thermocouples, infrared temperature-measurement components, heavy-duty reducers, high-temperature cables.

### Logistics & Warehousing

Conveyor rollers, idlers, chains and sprockets, belts, stoppers, stacker travel wheels and guide wheels, encoders, brakes, limit sensors, AGV navigation radar and charging modules, lifting tooling, wheel-sorter modules, code readers, safety light curtains and emergency-stop components.`;

export const DEFAULT_TERMS = `## 1. Definitions

- **We / Us / Our:** MROBOM.
- **You / Customer:** a business, institution or commercial buyer submitting enquiries or placing orders.
- **Products:** goods quoted, confirmed and supplied through this site.
- **Production-BOM:** the customer-supplied bill of materials, including revisions.
- **Order Confirmation:** the written document we issue, including a Proforma Invoice.

## 2. Acceptance of Terms

These Terms govern all visits, enquiries, quotations, orders, payments, deliveries and after-sales service. By using this site you accept them; if you do not, please stop using it. Separate written agreements or special terms stated in an Order Confirmation prevail for the matters they cover. We may verify customer identity and end use for sanctions, export-control and anti-money-laundering compliance, and may decline a transaction if verification fails. Contact: info@mrobom.com.

## 3. Website & Account Use

- The site is for business and commercial buyers only. You confirm that you are at least 18 and authorised to bind your organisation.
- Provide true and accurate registration, billing and shipping data; you bear costs caused by incorrect data, such as customs clearance failure or an invalid invoice.
- Prohibited: scraping, reverse engineering, penetration testing, uploading malicious code, fake-identity registration and account sharing.
- We do not guarantee uninterrupted availability; maintenance or third-party outages are not a breach. You are responsible for your account credentials, and we may suspend accounts showing abnormal login activity.

## 4. Quotations & Production-BOM

- Prices, stock and lead times shown on the site are indicative and not an offer. Binding terms exist only in our written quotation and Order Confirmation.
- Quotations are valid for 7 working days unless stated otherwise; afterwards we may re-quote at updated cost and exchange rates.
- For Production-BOM orders we price line by line and flag missing items, long-lead items, MOQ limits, alternative-only items and non-cancellable / non-returnable items.
- You are responsible for BOM completeness, accuracy and version control; any revision invalidates the original quotation. Errors in your BOM data are borne by you; we may correct material calculation errors, and you may accept the revised terms or cancel for a full refund of prepaid funds.

## 5. Orders, Rejection & Cancellation

- A contract exists only when we issue an Order Confirmation / Proforma Invoice and receive the agreed advance payment. A customer order alone creates no obligation.
- We may reject or cancel for stock shortage, material quotation error, unmet MOQ, failed identity or end-use verification, sanctions risk or credit concerns; prepayments are refunded.
- You may cancel free of charge before Order Confirmation. After confirmation, cancellation requires our written consent and you bear procurement, processing, freight and penalty costs. Non-cancellable / non-returnable items cannot be cancelled.
- A quantity tolerance of ±5% per shipment applies to industrial goods; settlement is based on the actual shipped quantity. Written partial shipments are treated as independent deliveries.

## 6. Products, Part Numbers & Substitute Parts

- Specifications, datasheets and images reference manufacturer documentation; official manufacturer datasheets prevail over site descriptions.
- MROBOM is not the manufacturer of most listed goods. Brand names, trademarks and part numbers identify compatibility only and belong to their respective owners; we are not an authorised reseller unless explicitly stated.
- Alternative, equivalent or refurbished parts are supplied only with your written acceptance and are marked on the quotation with source and key parameter differences. You are responsible for confirming part suitability; our identification assistance is not a fitness-for-purpose warranty.

## 7. Pricing, Currency, Taxes & Incoterms

- Quotations default to USD unless another currency is stated; payment currency matches the quotation currency.
- Unit prices exclude freight, insurance, export fees, import duties, VAT, customs brokerage, inspection and demurrage unless included in the quotation.
- Risk and cost allocation follows Incoterms 2020 as stated in the quotation (EXW / FOB / CIF / DAP). Import duties and taxes are for the buyer's account. We will not falsify values or commodity descriptions to reduce import tax.

## 8. Payment & Settlement

- Accepted methods: bank transfer to our official invoice account and card payment via a licensed third-party gateway. Cash and cheques are not accepted. Card data is processed by encrypted providers; we do not store full card numbers or CVV codes. Third-party payers require prior written notice and our approval.
- Unless otherwise agreed, full payment is due before shipment; custom-modified items may require a deposit of at least 30%. Bank charges, intermediary deductions and exchange-rate losses are borne by you. Short payment delays shipment, and overdue payment allows us to suspend shipments and other open orders.
- Refunds are made to the original payment method and currency; bank and exchange losses are non-refundable. Payments are screened for anti-money-laundering and sanctions compliance, and supporting documents may be requested.

## 9. Delivery & Documentation

- Lead time runs from Order Confirmation plus receipt of the agreed deposit, counted in working days. In-stock items usually ship within 3-7 working days; sourced items typically take 2-6 weeks as quoted.
- Modes: international courier, air freight or sea freight. Freight is charged on the greater of gross or volumetric weight, plus remote-area and fuel surcharges.
- Partial shipment is permitted with your consent, each with separate insurance, documents and settlement. Standard documents: commercial invoice and packing list. Certificates of origin, test reports and batch records depend on upstream supplier availability and must be requested at the enquiry stage.
- Risk passes on hand-over to the carrier. Inspect quantity and outer packaging on receipt and report damage to the carrier on site. We are not liable for carrier disruption, port congestion, customs inspection or force majeure. Costs from late clearance, non-collection or an incorrect delivery address are yours.

## 10. Inspection, Claims, RMA & Returns

- Visible damage, shortage or wrong-item claims: within 3 working days of receipt.
- Hidden functional or specification non-conformity: within 7 calendar days of receipt.
- Manufacturer warranty defects follow the applicable warranty period.
- Claims must state invoice number, part number, quantity, problem description, photos and packing list. Late claims deem visible quantity and appearance items accepted, without prejudice to hidden-defect rights.
- All returns require our written RMA number; unauthorised returns are rejected. Accepted: our wrong part or quantity, transit damage reported in time, goods not matching the confirmed order.
- Not accepted: correctly supplied standard parts; customer-caused reasons such as project cancellation or ordering error; complete BOM kits; custom-cut, modified or special-procurement goods; non-cancellable / non-returnable items; used or opened consumables; goods without original sellable packaging; expired claims.
- For our-fault returns, return freight is on us. For customer-initiated returns accepted as a courtesy, you cover both-way freight; replacement or re-shipment is preferred; refunds are completed within 5-10 working days after inspection, and a restocking fee of up to 20% of invoice value may apply.
- Quality disputes may be referred to a mutually agreed third-party laboratory, with the cost borne by the responsible party.

## 11. Warranty

- We pass through the original manufacturer warranty; scope and term follow the manufacturer specification stated on the quotation. No additional independent warranty is given.
- No implied warranty of merchantability or fitness for a specific purpose applies. The warranty excludes damage from over-rating, improper installation, unauthorised modification, normal wear and tear, corrosion or external mechanical impact.
- The remedy is limited to replacement, repair or partial / full refund of the defective item at our option, subject to the liability cap below.

## 12. Confidentiality & Intellectual Property

- Your BOM documents, drawings, technical requirements and project information are treated as confidential and used only for quotation and order fulfilment. We will not publish them or use them as marketing samples without consent. Confidentiality lasts 5 years from receipt, or longer if required by law.
- Our site text, layout, original images, data compilation and the MROBOM brand are protected intellectual property. You may download product documents for internal procurement use only. Systematic scraping, mass copying, reproduction or dataset building without written permission is prohibited.
- Third-party trademarks are shown for identification only and imply no agency or partnership. IP infringement notices may be sent to info@mrobom.com.

## 13. Privacy & Cookies

- We collect business contact data, order records, BOM files, transaction metadata and access logs for contract performance, fraud prevention, tax and export archiving, and service improvement. We do not sell personal data.
- Necessary cookies enable basic site function; analytics and marketing cookies activate only with your consent. Processors include payment providers, freight forwarders, cloud hosting and accounting consultants. Data may be processed in China, Singapore, the EU and the USA under lawful cross-border transfer safeguards.
- Retention: order documents 7 years; unprocessed enquiries 24 months; access logs 12 months. You may exercise data-subject rights by emailing info@mrobom.com; we respond within 30 calendar days. This site is not intended for minors.

## 14. Export Control & Sanctions

You are responsible for local import permits and for the end use and end user of purchased goods. You agree not to re-export or divert goods to sanctioned jurisdictions or entities, or to prohibited military or WMD-related applications. We may request end-use statements and may suspend or cancel orders if they are refused. We incur no liability for non-performance compelled by applicable sanctions or export-control law.

## 15. Limitation of Liability

Our total aggregate liability for any single claim shall not exceed the invoiced value of the goods giving rise to it. We are not liable for indirect, consequential, special or punitive damages, including lost profit, production downtime, loss of goodwill or third-party indemnity claims. Mandatory statutory exceptions such as wilful misconduct, gross negligence or personal injury are unaffected. Claims must be filed within 12 months of delivery unless a longer statutory period applies. You shall take reasonable steps to mitigate loss after discovering damage.

## 16. Force Majeure

Force majeure includes natural disaster, war, strike, government regulatory action, export-control measures, port closure and upstream supplier shutdown. Cost increases, exchange-rate movements and purely commercial risks are not force majeure. The affected party shall give prompt written notice. If force majeure persists beyond 60 consecutive days, either party may terminate the affected part of the contract; completed performance is settled accordingly with no further liability on either side.

## 17. Suspension & Termination

We may suspend performance for overdue payment, failed verification, sanctions risk or unresolved material quality disputes, and may terminate for material breach without remedy, insolvency, bankruptcy or sanctions-list inclusion. Termination does not extinguish payment obligations for goods already shipped. Set-off of mutual receivables and payables is permitted.

## 18. Governing Law & Dispute Resolution

These Terms and related sales contracts are governed by the laws of the People's Republic of China. Disputes first go through 30 days of amicable negotiation after written notice; if unresolved, the competent courts in China have exclusive jurisdiction. The UN Convention on Contracts for the International Sale of Goods (CISG) is excluded. Where multiple language versions exist, the English version prevails.

## 19. Amendment & Severability

We may revise these Terms by publishing an updated version with an effective date; revisions do not affect orders confirmed before that date. If a clause is held invalid or unenforceable, the remaining clauses stay in full force. These Terms, together with the quotation, proforma invoice, order confirmation and packing list, form the entire agreement and supersede prior oral or written arrangements. You may not assign contractual rights without our written consent; we may assign this agreement in a merger, acquisition or business transfer with prior notice. Notice sent to the registered contact email counts as valid delivery. Failure to enforce any provision does not waive that right.`;

export const DEFAULT_CONTENT: Record<ContentKey, string> = {
  about: DEFAULT_ABOUT,
  terms: DEFAULT_TERMS,
};

export interface PageContent {
  value: string;
  /** ISO 字符串；unstable_cache 序列化后 Date 无法保持对象类型 */
  updatedAt: string | null;
}

async function readContent(key: ContentKey): Promise<PageContent> {
  try {
    const row = await prisma.siteContent.findUnique({ where: { key } });
    if (!row || !row.value.trim()) {
      return { value: DEFAULT_CONTENT[key], updatedAt: null };
    }
    return { value: row.value, updatedAt: row.updatedAt.toISOString() };
  } catch {
    // 数据库异常 → 回落默认文案，页面不 500
    return { value: DEFAULT_CONTENT[key], updatedAt: null };
  }
}

export async function getPage(key: ContentKey): Promise<PageContent> {
  try {
    return await unstable_cache(() => readContent(key), ["site-content", key], {
      tags: [`page-${key}`],
      revalidate: 86400,
    })();
  } catch {
    return { value: DEFAULT_CONTENT[key], updatedAt: null };
  }
}
