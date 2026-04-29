export type PriceCatalog = {
  cementBag: number;
  sandM3: number;
  gravelM3: number;
  block: number;
  steelKg: number;
  laborM2Concrete: number;
  laborM2BlockWall: number;
  /** COP por saco de estuco (25 kg) */
  stuccoSaco25kg: number;
  /** COP por saco de masilla / mastic (27 kg) */
  masticSaco27kg: number;
  /** COP por cuñete de pintura (19,25 L) */
  paintCunete19_25L: number;
  laborM2Stucco: number;
  /** Graniplast o texturizado */
  graniplastKg: number;
  laborM2Graniplast: number;
  /** COP por saco adhesivo ceram/porcellanato típico 25 kg */
  tileMortarSac25kg: number;
  /** COP por saco rejunte habitual 5 kg */
  tileGroutSac5kg: number;
  /** Mano obra colocación cerámica/porcellanato (m²) */
  laborM2TileLay: number;
  /** COP por m³ · balasto (arena + piedra vendidas como volumen único en obra habitual vs arena/grava aparte). */
  balastoM3: number;
  wastePercent: number;
  profitMargin: number;
};

export type ConcreteAggregateMode = "separate" | "balasto";

/** Columna prismática: cantidad · sección rectangular (cm) · altura útil (m). */
export type ConcreteColumnInput = {
  qty: number;
  sectionWidthCm: number;
  sectionDepthCm: number;
  heightM: number;
};

/** Vigas: cantidad de elementos · tramo (m) · sección ancho/profundidad (cm del alma/montante según uses en obra). */
export type ConcreteBeamInput = {
  qty: number;
  spanM: number;
  widthCm: number;
  depthCm: number;
};

export type ConcreteSlabResult = {
  /** Volumen sólo de losa (huella) */
  slabVolumeM3: number;
  /** Suma de volumen de columnas indicadas */
  columnsVolumeM3: number;
  /** Suma de volumen de vigas indicadas */
  beamsVolumeM3: number;
  /** Volumen total de concreto (losa + columnas + vigas) */
  volumeM3: number;
  cementBags: number;
  sandM3: number;
  gravelM3: number;
  aggregateMode: ConcreteAggregateMode;
  /** Hierro/acero orientativo según volumen de columnas (~kg hormigón·m³ habitual colombiano). */
  steelKgColumnsEstimate: number;
  /** Idem vigas/losas apoyadas típicamente con menor coef. que columnas por m³ hormigón */
  steelKgBeamsEstimate: number;
  /** Suma de las dos líneas anteriores (referencia cotización materiales hierro columnas+vigas). */
  steelStructuralKgTotal: number;
};

export type BlockWallResult = {
  areaM2: number;
  blocksNeeded: number;
};

/** Estuco + masilla + pintura (cantidades aprox. por m²) */
export type StuccoFinishResult = {
  areaM2: number;
  stuccoKg: number;
  masticKg: number;
  paintLiters: number;
};

export type GraniplastResult = {
  areaM2: number;
  graniplastKg: number;
};

/** Pegado cerámico / porcelanato · adhesivo + rejunte (consumos kg aprox.). */
export type TileLayResult = {
  areaM2: number;
  mortarKg: number;
  groutKg: number;
};

export type CalculationResult = {
  materials: {
    name: string;
    unit: string;
    quantity: number;
    unitCost: number;
    subtotal: number;
  }[];
  labor: {
    name: string;
    unit: string;
    quantity: number;
    unitCost: number;
    subtotal: number;
  }[];
  extras: { name: string; subtotal: number }[];
  totals: {
    materialsTotal: number;
    laborTotal: number;
    extrasTotal: number;
    subtotal: number;
    profit: number;
    total: number;
  };
};

export type QuoteLineSource =
  | "concrete"
  | "blocks"
  | "stucco"
  | "graniplast"
  | "tile"
  | "manual";

export type DraftQuoteContext = {
  source: QuoteLineSource;
  label: string;
  concrete?: ConcreteSlabResult | null;
  blockWall?: BlockWallResult | null;
};

export type CalculatorId = "concrete" | "blocks" | "stucco" | "graniplast" | "tile";

export type LastCalculator =
  | {
      id: "concrete";
      inputs: {
        lengthM: number;
        widthM: number;
        thicknessCm: number;
        wastePercent: number | null;
        aggregateMode?: ConcreteAggregateMode;
        columns?: ConcreteColumnInput[];
        beams?: ConcreteBeamInput[];
      };
      result: ConcreteSlabResult;
    }
  | {
      id: "blocks";
      inputs: { lengthM: number; heightM: number; blockType: string; wastePercent: number | null };
      result: BlockWallResult;
    }
  | {
      id: "stucco";
      inputs: {
        areaM2: number;
        stuccoCoats: number;
        masticCoats: number;
        paintCoats: number;
        wastePercent: number | null;
      };
      result: StuccoFinishResult;
    }
    | {
      id: "graniplast";
      inputs: { areaM2: number; coats: number; wastePercent: number | null };
      result: GraniplastResult;
    }
  | {
      id: "tile";
      inputs: { areaM2: number; wastePercent: number | null };
      result: TileLayResult;
    }
  | null;

export type QuoteBasketItem = {
  id: string;
  kind: CalculatorId;
  label: string;
  /** Cotización parcial para fusionar líneas del carrito luego */
  result: CalculationResult;
  /** Unix ms cuando se añadió esta partida al carrito (persistido; opcional en datos antiguos) */
  addedAt?: number;
};

/** Mensajes del chat del asistente IA (persisten en disco con el perfil invitado). */
export type AiAssistantChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
