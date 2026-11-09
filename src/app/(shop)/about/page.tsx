export default function AboutPage() {
  const supplyCategories = [
    {
      title: "Electrical",
      items:
        "Switching power supplies, DIN-rail power supplies, isolation and control transformers, UPS, circuit breakers, fuses, surge protectors, contactors, solid-state relays, terminal blocks, DIN rail, connectors, industrial cable, drag-chain cable, heat-shrink tubing, distribution boxes, pushbuttons and indicator lights, cabinet fans and air conditioners, explosion-proof electrical equipment.",
    },
    {
      title: "Mechanical",
      items:
        "Bearings, bearing housings, ball screws, guide shafts, linear guides, sliders, linear modules, electric cylinders, timing belts and pulleys, chains and sprockets, couplings, O-rings, oil seals, gaskets, fasteners, springs and shock absorbers, aluminium profiles, castors, mould standard parts.",
    },
    {
      title: "Control",
      items:
        "PLC programmable controllers, CPU and I/O expansion modules, HMI panels, industrial touch screens, industrial PCs, temperature controllers, PID controllers, counters, safety relays, emergency-stop and safety-door modules, Modbus/Profinet/EtherNet-IP gateways, signal isolation transmitters, safety light-curtain controllers.",
    },
    {
      title: "Sensors",
      items:
        "Inductive and capacitive proximity sensors, photoelectric and laser sensors, pressure switches, vacuum, flow and level sensors, thermocouples, RTDs, temperature probes, displacement and angle sensors, incremental and absolute encoders, vision sensors, smart cameras, code readers, RFID, ultrasonic and colour sensors.",
    },
    {
      title: "Drives",
      items:
        "Servo motors and servo drives, stepper motors and drivers, VFDs, soft starters, three-phase and single-phase induction motors, geared motors, gear motors, electric actuators, electric cylinders, motor brakes, cooling accessories.",
    },
    {
      title: "Fluid",
      items:
        "Pneumatic cylinders, pneumatic grippers, rotary actuators, solenoid valves, air-pilot valves, valve islands, FRL units, pneumatic fittings, PU tubing, silencers, vacuum generators, suction cups, hydraulic cylinders, hydraulic valves, hydraulic fittings, high-pressure hoses, pumps, flow meters, fluid filters.",
    },
    {
      title: "CNC & Robotics",
      items:
        "CNC system panels, servo drives, I/O expansion, CNC operator units, turrets, tool magazines, spindle parts; six-axis articulated robots, SCARA robots, collaborative robots (COBOT), Delta parallel robots, gantry and Cartesian robots, AMR/AGV mobile robots, industrial UAVs, machine-vision cameras and light sources, robot cable packages, grippers and quick-change tooling, 3D printer filaments.",
    },
    {
      title: "Building Systems",
      items:
        "DDC controllers, BACnet and KNX gateways, VAV and fan-coil controllers, temperature/humidity and differential-pressure sensors, CO₂ sensors, damper and motorised valve actuators; smart luminaires, DALI gateways, dimming modules, emergency lighting; access controllers, card readers, electromagnetic locks, fire-linkage modules; building switches, IoT gateways, bus cables, cable trays.",
    },
    {
      title: "Instruments & Tools",
      items:
        "Multimeters, oscilloscopes, callipers, micrometers, height gauges, vibration meters, force gauges, temperature and pressure calibrators, hand and power tools, pneumatic tools, torque tools, drill bits, taps, milling cutters, oil stones, grinding wheels and sandpaper, fixtures and tool holders.",
    },
    {
      title: "Lab Supplies",
      items:
        "Laboratory measuring instruments, environmental test chambers, temperature and humidity recorders, test reagents, sampling containers, beakers, filtration consumables, anti-static laboratory utensils, gas detectors, water-quality testing accessories.",
    },
    {
      title: "Custom & Services",
      items:
        "Machined parts to drawing (turning, milling, grinding, sheet metal), non-standard fasteners, non-standard mould parts, wiring harnesses and cable assemblies, production-BOM kitting, discontinued-part alternative selection, special-specification sourcing, technical consultation and documentation support.",
    },
  ];

  const industries = [
    {
      title: "Cement Industry",
      items:
        "Wear-resistant castings and liners, rotary-kiln tyres, support rollers and girth gears, ball-mill grinding balls and cylpebs, elevator buckets and plate chains, conveyor idlers and pulleys, dust-collector filter bags and cages, high-temperature butterfly valves and slide gates, wear-resistant pipes and compensators, high-temperature thermocouples, refractory and insulation materials, laminated PP woven bags.",
    },
    {
      title: "Electronics & Semiconductor",
      items:
        "SMT nozzles, placement-machine guide rails, drive belts, cutting blades, ceramic nozzles, probes, test sockets, carriers and fixtures, cleanroom wipes and anti-static gloves, solder paste, flux, soldering tips, thermodes, release films, FFU fan filter units, differential-pressure sensors, precision grippers.",
    },
    {
      title: "Automotive Manufacturing",
      items:
        "Welding-gun electrode tips, contact tips, welding-clamp cables, safety light curtains, stamping-die springs and punches, stripper bolts, paint-robot spare parts, electrostatic spray-gun parts, tightening-spindle assemblies, torque tools, conveyor chains, roller-bed spare parts, stopper cylinders, robot cable packages and reducers.",
    },
    {
      title: "Lithium-Battery",
      items:
        "Coating and calendering rollers, slitting knife rollers and blades, ceramic rollers, winding needles, press rollers, separator fixtures, vacuum suction assemblies, injection sealing valves, corrosion-resistant piping, PACK hot-press heads and fixtures, cell fixtures, explosion-proof and corrosion-resistant sensors, Delta sorting spare parts.",
    },
    {
      title: "Photovoltaic / PV",
      items:
        "Diamond wire saws, cutting rollers, ceramic fixtures, diffusion-furnace and PECVD furnace tubes, quartz parts, corrosion-resistant seals, stringer soldering heads, EVA cutting blades, lamination silicone pads, vacuum suction cups and generators, EL inspection cameras, high-temperature conveyor belts.",
    },
    {
      title: "Food & Pharmaceutical",
      items:
        "Stainless-steel sanitary valves and quick-connect fittings, silicone seals, food-grade hoses and conveyor belts, mesh belts, sanitary bearings, filling valves, labelling-machine rollers, heat-sealing strips, CIP cleaning balls, sanitary filters, sanitary pressure and temperature sensors, GMP cleanroom consumables.",
    },
    {
      title: "Steel & Metallurgy",
      items:
        "Heat-resistant castings, tuyère sleeves, cooling walls, high-temperature compensators, rolling rolls, bearing housings, guides, wear-resistant liners, hydraulic servo valves, high-temperature butterfly valves, metal expansion joints, dust-collector filter bags, high-temperature thermocouples, infrared temperature-measurement components, heavy-duty reducers, high-temperature cables.",
    },
    {
      title: "Logistics & Warehousing",
      items:
        "Conveyor rollers, idlers, chains and sprockets, belts, stoppers, stacker travel wheels and guide wheels, encoders, brakes, limit sensors, AGV navigation radar and charging modules, lifting tooling, wheel-sorter modules, code readers, safety light curtains and emergency-stop components.",
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto main-scrollbar">
      <div className="h-0.5 bg-amber-400 shrink-0"></div>
      <div className="px-6 py-10 text-left">
        {/* About MROBOM */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">About MROBOM</h2>
          <p className="text-[13px] text-slate-600 leading-relaxed mb-3">
            MROBOM supplies production MRO (Maintenance, Repair &amp; Operations) and BOM (Bill of Materials) materials to customers worldwide, together with a broad portfolio of service solutions.
          </p>
          <p className="text-[13px] text-slate-600 leading-relaxed mb-3">
            MROBOM empowers product design through innovation and technology, helping customers increase capacity, shorten lead times and reduce procurement costs, and optimising inventory management across maintenance, repair and operations. Alongside full-lifecycle product support, we deliver customised product and service solutions that help customers achieve both cost efficiency and business growth.
          </p>
          <p className="text-[13px] text-slate-600 leading-relaxed mb-3">
            Goods are sourced from factories, authorised channels and confirmed stock; alternative, equivalent or refurbished items are stated on the quotation.
          </p>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Quotations verify part numbers against the manufacturer datasheet, and every shipment is accompanied by a commercial invoice, packing list and the required certificates.
          </p>
        </section>

        {/* Transactions and statements */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">Transactions and Statements</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>Self-service ordering is supported for products marked as &quot;self&quot; in the order; manual quotation is also available.</li>
            <li>Time standard: GMT+8. Enquiries are answered within one business day.</li>
            <li>The site is intended for businesses, institutions and commercial buyers only.</li>
            <li>MROBOM is an independent product distributor; trademarks belong to their respective owners.</li>
          </ul>
        </section>

        {/* Supply Scope */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-1">Supply Scope</h2>
          <div className="grid md:grid-cols-2 gap-x-10">
            {supplyCategories.map((category) => (
              <div key={category.title} className="mt-4 break-inside-avoid">
                <h3 className="text-[13px] font-bold text-slate-900 mb-1">{category.title}</h3>
                <p className="text-[13px] text-slate-600 leading-relaxed">{category.items}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Industry-specific products */}
        <section>
          <h2 className="text-[15px] font-bold text-slate-900 mb-1">Industry-Specific Products</h2>
          <div className="grid md:grid-cols-2 gap-x-10">
            {industries.map((industry) => (
              <div key={industry.title} className="mt-4 break-inside-avoid">
                <h3 className="text-[13px] font-bold text-slate-900 mb-1">{industry.title}</h3>
                <p className="text-[13px] text-slate-600 leading-relaxed">{industry.items}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
