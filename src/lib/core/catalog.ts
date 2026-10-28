/** Catálogo embutido (portado do app nativo). A `key` é fixa: liga as palavras-chave e junta duplicatas. */
export type CategoryKind = 'expense' | 'income' | 'transfer';
export type CostType = 'fixed' | 'variable';

export interface CategorySeed {
  key: string;
  name: string;
  /** Nome de ícone (ver ui/icons.ts). */
  symbol: string;
  color: string;
  kind: CategoryKind;
  parent: string | null;
  cost: CostType;
  keywords: string[];
}

export interface MerchantSeed {
  key: string;
  name: string;
  patterns: string[];
  emoji: string;
  color: string;
  category: string;
  cost: CostType | null;
  domain: string;
}

export const UNCATEGORIZED = 'outros';
export const INTERNAL_TRANSFER = 'transferencia-interna';
export const CARD_PAYMENT = 'pagamento-fatura';
export const INVESTMENT = 'investimentos';
export const CASH_WITHDRAWAL = 'saque';

export const categorySeeds: CategorySeed[] = [
  {
    "key": "casa",
    "name": "Casa",
    "symbol": "house",
    "color": "#38D9F5",
    "kind": "expense",
    "parent": null,
    "cost": "fixed",
    "keywords": []
  },
  {
    "key": "casa-moradia",
    "name": "Aluguel e condomínio",
    "symbol": "building.2",
    "color": "#38D9F5",
    "kind": "expense",
    "parent": "casa",
    "cost": "fixed",
    "keywords": [
      "aluguel",
      "condominio",
      "iptu",
      "imobiliaria",
      "quintoandar",
      "lello",
      "hubert",
      "auxiliadora predial",
      "administradora de condominios",
      "seguro residencial"
    ]
  },
  {
    "key": "casa-luz",
    "name": "Luz",
    "symbol": "bolt",
    "color": "#38D9F5",
    "kind": "expense",
    "parent": "casa",
    "cost": "fixed",
    "keywords": [
      "enel",
      "cemig",
      "light s",
      "cpfl",
      "energisa",
      "coelba",
      "celesc",
      "copel",
      "equatorial",
      "neoenergia",
      "conta de luz",
      "forca e luz",
      "companhia paulista de forca",
      "eletropaulo",
      "energia eletrica"
    ]
  },
  {
    "key": "casa-agua",
    "name": "Água",
    "symbol": "drop",
    "color": "#38D9F5",
    "kind": "expense",
    "parent": "casa",
    "cost": "fixed",
    "keywords": [
      "sabesp",
      "copasa",
      "embasa",
      "sanepar",
      "cedae",
      "conta de agua",
      "saneamento",
      "aguas de"
    ]
  },
  {
    "key": "casa-gas",
    "name": "Gás",
    "symbol": "flame",
    "color": "#38D9F5",
    "kind": "expense",
    "parent": "casa",
    "cost": "fixed",
    "keywords": [
      "comgas",
      "naturgy",
      "supergasbras",
      "ultragaz",
      "liquigas",
      "copagaz",
      "nacional gas",
      "consigaz",
      "gas natural"
    ]
  },
  {
    "key": "casa-internet",
    "name": "Internet e telefone",
    "symbol": "wifi",
    "color": "#38D9F5",
    "kind": "expense",
    "parent": "casa",
    "cost": "fixed",
    "keywords": [
      "vivo",
      "claro",
      "tim ",
      "tim celular",
      "oi fibra",
      "net servicos",
      "nio fibra",
      "algar",
      "brisanet",
      "starlink",
      "comunicacao multimidia",
      "telecom",
      "fibra optica",
      "provedor",
      "internet"
    ]
  },
  {
    "key": "casa-manutencao",
    "name": "Manutenção e reparos",
    "symbol": "hammer",
    "color": "#38D9F5",
    "kind": "expense",
    "parent": "casa",
    "cost": "variable",
    "keywords": [
      "leroy merlin",
      "telhanorte",
      "c&c",
      "material de construcao",
      "eletricista",
      "encanador",
      "chaveiro"
    ]
  },
  {
    "key": "casa-itens",
    "name": "Itens para casa",
    "symbol": "sofa",
    "color": "#38D9F5",
    "kind": "expense",
    "parent": "casa",
    "cost": "variable",
    "keywords": [
      "tok&stok",
      "etna",
      "camicado",
      "havan",
      "mobly",
      "madeiramadeira"
    ]
  },
  {
    "key": "alimentacao",
    "name": "Alimentação",
    "symbol": "fork.knife",
    "color": "#FF9F1C",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": []
  },
  {
    "key": "alim-mercado",
    "name": "Supermercado",
    "symbol": "cart",
    "color": "#FF9F1C",
    "kind": "expense",
    "parent": "alimentacao",
    "cost": "variable",
    "keywords": [
      "supermercado",
      "mercado",
      "carrefour",
      "assai",
      "atacadao",
      "pao de acucar",
      "extra hiper",
      "hortifruti",
      "sams club",
      "makro",
      "atacarejo",
      "sonda",
      "zaffari",
      "savegnago",
      "tenda atacado",
      "dia brasil",
      "mambo",
      "st marche",
      "oba hortifruti",
      "mercadinho",
      "sacolao",
      "acougue"
    ]
  },
  {
    "key": "alim-restaurante",
    "name": "Restaurantes",
    "symbol": "fork.knife",
    "color": "#FF9F1C",
    "kind": "expense",
    "parent": "alimentacao",
    "cost": "variable",
    "keywords": [
      "restaurante",
      "lanchonete",
      "burger",
      "mcdonald",
      "bk brasil",
      "subway",
      "outback",
      "habibs",
      "spoleto",
      "churrascaria",
      "sushi",
      "bar e",
      "boteco",
      "coco bambu",
      "giraffas",
      "pizzaria"
    ]
  },
  {
    "key": "alim-delivery",
    "name": "Delivery",
    "symbol": "bag",
    "color": "#FF9F1C",
    "kind": "expense",
    "parent": "alimentacao",
    "cost": "variable",
    "keywords": [
      "ifood",
      "ifd*",
      "rappi",
      "ze delivery",
      "aiqfome",
      "james delivery"
    ]
  },
  {
    "key": "alim-padaria",
    "name": "Padaria e café",
    "symbol": "cup.and.saucer",
    "color": "#FF9F1C",
    "kind": "expense",
    "parent": "alimentacao",
    "cost": "variable",
    "keywords": [
      "padaria",
      "panificadora",
      "cafeteria",
      "starbucks",
      "cafe ",
      "acai",
      "sorveteria",
      "doceria"
    ]
  },
  {
    "key": "carro",
    "name": "Carro e transporte",
    "symbol": "car",
    "color": "#FFD60A",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": []
  },
  {
    "key": "carro-combustivel",
    "name": "Combustível",
    "symbol": "fuelpump",
    "color": "#FFD60A",
    "kind": "expense",
    "parent": "carro",
    "cost": "variable",
    "keywords": [
      "posto",
      "shell",
      "ipiranga",
      "petrobras",
      "br mania",
      "ale combustiveis",
      "auto posto",
      "combustivel",
      "raizen"
    ]
  },
  {
    "key": "carro-estacionamento",
    "name": "Estacionamento",
    "symbol": "parkingsign",
    "color": "#FFD60A",
    "kind": "expense",
    "parent": "carro",
    "cost": "variable",
    "keywords": [
      "estacionamento",
      "estapar",
      "zul digital",
      "zona azul",
      "multipark",
      "parking"
    ]
  },
  {
    "key": "carro-pedagio",
    "name": "Pedágio e tag",
    "symbol": "road.lanes",
    "color": "#FFD60A",
    "kind": "expense",
    "parent": "carro",
    "cost": "variable",
    "keywords": [
      "sem parar",
      "conectcar",
      "veloe",
      "pedagio",
      "move mais",
      "taggy"
    ]
  },
  {
    "key": "carro-manutencao",
    "name": "Manutenção",
    "symbol": "wrench.and.screwdriver",
    "color": "#FFD60A",
    "kind": "expense",
    "parent": "carro",
    "cost": "variable",
    "keywords": [
      "oficina",
      "auto center",
      "pneu",
      "autopecas",
      "auto pecas",
      "lava rapido",
      "lavagem",
      "mecanica",
      "funilaria"
    ]
  },
  {
    "key": "carro-seguro",
    "name": "Seguro do carro",
    "symbol": "shield",
    "color": "#FFD60A",
    "kind": "expense",
    "parent": "carro",
    "cost": "fixed",
    "keywords": [
      "porto seguro",
      "azul seguros",
      "allianz",
      "tokio marine",
      "hdi seguros",
      "liberty seguros",
      "seguro auto"
    ]
  },
  {
    "key": "carro-impostos",
    "name": "IPVA e licenciamento",
    "symbol": "doc.text",
    "color": "#FFD60A",
    "kind": "expense",
    "parent": "carro",
    "cost": "variable",
    "keywords": [
      "detran",
      "ipva",
      "licenciamento",
      "multa de transito"
    ]
  },
  {
    "key": "carro-apps",
    "name": "Uber e 99",
    "symbol": "car.side",
    "color": "#FFD60A",
    "kind": "expense",
    "parent": "carro",
    "cost": "variable",
    "keywords": [
      "uber",
      "99app",
      "99 tecnologia",
      "99 pop",
      "cabify",
      "indrive"
    ]
  },
  {
    "key": "carro-publico",
    "name": "Ônibus e metrô",
    "symbol": "tram",
    "color": "#FFD60A",
    "kind": "expense",
    "parent": "carro",
    "cost": "variable",
    "keywords": [
      "metro",
      "bilhete unico",
      "sptrans",
      "cptm",
      "top card",
      "riocard",
      "bom recarga"
    ]
  },
  {
    "key": "saude",
    "name": "Saúde",
    "symbol": "cross.case",
    "color": "#FF6B6B",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": []
  },
  {
    "key": "saude-farmacia",
    "name": "Farmácia",
    "symbol": "pills",
    "color": "#FF6B6B",
    "kind": "expense",
    "parent": "saude",
    "cost": "variable",
    "keywords": [
      "drogasil",
      "droga raia",
      "raia",
      "drogaria",
      "farmacia",
      "pague menos",
      "panvel",
      "sao joao farmacia",
      "drogao"
    ]
  },
  {
    "key": "saude-plano",
    "name": "Plano de saúde",
    "symbol": "heart.text.square",
    "color": "#FF6B6B",
    "kind": "expense",
    "parent": "saude",
    "cost": "fixed",
    "keywords": [
      "unimed",
      "amil",
      "hapvida",
      "bradesco saude",
      "sulamerica",
      "notredame",
      "prevent senior",
      "odontoprev"
    ]
  },
  {
    "key": "saude-consultas",
    "name": "Consultas e exames",
    "symbol": "stethoscope",
    "color": "#FF6B6B",
    "kind": "expense",
    "parent": "saude",
    "cost": "variable",
    "keywords": [
      "hospital",
      "clinica",
      "laboratorio",
      "odonto",
      "dentista",
      "psicolog",
      "fleury",
      "dasa",
      "medico",
      "exame"
    ]
  },
  {
    "key": "assinaturas",
    "name": "Assinaturas",
    "symbol": "play.rectangle",
    "color": "#E056FD",
    "kind": "expense",
    "parent": null,
    "cost": "fixed",
    "keywords": []
  },
  {
    "key": "ass-streaming",
    "name": "Streaming",
    "symbol": "tv",
    "color": "#E056FD",
    "kind": "expense",
    "parent": "assinaturas",
    "cost": "fixed",
    "keywords": [
      "netflix",
      "spotify",
      "disney",
      "hbo",
      "max.com",
      "prime video",
      "amazon prime",
      "youtube",
      "deezer",
      "globoplay",
      "paramount",
      "crunchyroll",
      "telecine",
      "apple tv"
    ]
  },
  {
    "key": "ass-apps",
    "name": "Apps e nuvem",
    "symbol": "icloud",
    "color": "#E056FD",
    "kind": "expense",
    "parent": "assinaturas",
    "cost": "fixed",
    "keywords": [
      "apple.com",
      "icloud",
      "google one",
      "google storage",
      "chatgpt",
      "openai",
      "microsoft",
      "adobe",
      "dropbox",
      "claude.ai",
      "anthropic",
      "nic. br",
      "nic.br",
      "registro.br",
      "github"
    ]
  },
  {
    "key": "compras",
    "name": "Compras",
    "symbol": "bag",
    "color": "#B388FF",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": []
  },
  {
    "key": "compras-online",
    "name": "Lojas online",
    "symbol": "shippingbox",
    "color": "#B388FF",
    "kind": "expense",
    "parent": "compras",
    "cost": "variable",
    "keywords": [
      "amazon",
      "mercado livre",
      "mercadolivre",
      "shopee",
      "aliexpress",
      "magalu",
      "magazine luiza",
      "americanas",
      "casas bahia",
      "temu",
      "shein"
    ]
  },
  {
    "key": "compras-roupas",
    "name": "Roupas e calçados",
    "symbol": "tshirt",
    "color": "#B388FF",
    "kind": "expense",
    "parent": "compras",
    "cost": "variable",
    "keywords": [
      "renner",
      "riachuelo",
      "c&a",
      "zara",
      "centauro",
      "netshoes",
      "calcados",
      "hering",
      "marisa"
    ]
  },
  {
    "key": "compras-eletronicos",
    "name": "Eletrônicos",
    "symbol": "desktopcomputer",
    "color": "#B388FF",
    "kind": "expense",
    "parent": "compras",
    "cost": "variable",
    "keywords": [
      "kabum",
      "fast shop",
      "pichau",
      "terabyte",
      "apple store",
      "samsung"
    ]
  },
  {
    "key": "educacao",
    "name": "Educação",
    "symbol": "graduationcap",
    "color": "#2EC4B6",
    "kind": "expense",
    "parent": null,
    "cost": "fixed",
    "keywords": []
  },
  {
    "key": "edu-escola",
    "name": "Escola e faculdade",
    "symbol": "building.columns",
    "color": "#2EC4B6",
    "kind": "expense",
    "parent": "educacao",
    "cost": "fixed",
    "keywords": [
      "escola",
      "colegio",
      "faculdade",
      "universidade",
      "mensalidade escolar"
    ]
  },
  {
    "key": "edu-cursos",
    "name": "Cursos e livros",
    "symbol": "book",
    "color": "#2EC4B6",
    "kind": "expense",
    "parent": "educacao",
    "cost": "variable",
    "keywords": [
      "curso",
      "udemy",
      "alura",
      "livraria",
      "amazon kindle",
      "material escolar"
    ]
  },
  {
    "key": "lazer",
    "name": "Lazer e viagens",
    "symbol": "theatermasks",
    "color": "#F7D44C",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": []
  },
  {
    "key": "lazer-passeios",
    "name": "Passeios e eventos",
    "symbol": "ticket",
    "color": "#F7D44C",
    "kind": "expense",
    "parent": "lazer",
    "cost": "variable",
    "keywords": [
      "cinema",
      "cinemark",
      "ingresso",
      "sympla",
      "eventim",
      "parque",
      "teatro",
      "show"
    ]
  },
  {
    "key": "lazer-viagens",
    "name": "Viagens",
    "symbol": "airplane",
    "color": "#F7D44C",
    "kind": "expense",
    "parent": "lazer",
    "cost": "variable",
    "keywords": [
      "airbnb",
      "booking",
      "latam",
      "gol linhas",
      "azul linhas",
      "hotel",
      "pousada",
      "decolar",
      "123milhas"
    ]
  },
  {
    "key": "lazer-jogos",
    "name": "Jogos",
    "symbol": "gamecontroller",
    "color": "#F7D44C",
    "kind": "expense",
    "parent": "lazer",
    "cost": "variable",
    "keywords": [
      "steam",
      "playstation",
      "xbox",
      "nintendo",
      "coins",
      "riot games",
      "epic games"
    ]
  },
  {
    "key": "cuidados",
    "name": "Cuidados pessoais",
    "symbol": "heart",
    "color": "#FF8FAB",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": []
  },
  {
    "key": "cuidados-academia",
    "name": "Academia",
    "symbol": "dumbbell",
    "color": "#FF8FAB",
    "kind": "expense",
    "parent": "cuidados",
    "cost": "fixed",
    "keywords": [
      "academia",
      "smart fit",
      "smartfit",
      "bluefit",
      "gympass",
      "wellhub",
      "totalpass",
      "crossfit"
    ]
  },
  {
    "key": "cuidados-beleza",
    "name": "Beleza e salão",
    "symbol": "comb",
    "color": "#FF8FAB",
    "kind": "expense",
    "parent": "cuidados",
    "cost": "variable",
    "keywords": [
      "salao",
      "barbearia",
      "perfumaria",
      "boticario",
      "natura",
      "sephora",
      "cabeleireiro",
      "manicure",
      "estetica"
    ]
  },
  {
    "key": "filhos",
    "name": "Filhos",
    "symbol": "figure.and.child.holdinghands",
    "color": "#90E0EF",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": [
      "ri happy",
      "pbkids",
      "fraldas",
      "baby",
      "infantil",
      "bercario"
    ]
  },
  {
    "key": "pets",
    "name": "Pets",
    "symbol": "pawprint",
    "color": "#A3D977",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": [
      "petz",
      "cobasi",
      "petlove",
      "veterinari",
      "pet shop",
      "petshop",
      "racao"
    ]
  },
  {
    "key": "taxas",
    "name": "Impostos e tarifas",
    "symbol": "building.columns",
    "color": "#9E9E9E",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": []
  },
  {
    "key": "taxas-banco",
    "name": "Tarifas e juros",
    "symbol": "percent",
    "color": "#9E9E9E",
    "kind": "expense",
    "parent": "taxas",
    "cost": "variable",
    "keywords": [
      "iof",
      "tarifa",
      "juros",
      "multa",
      "anuidade",
      "encargos"
    ]
  },
  {
    "key": "taxas-impostos",
    "name": "Impostos",
    "symbol": "doc.plaintext",
    "color": "#9E9E9E",
    "kind": "expense",
    "parent": "taxas",
    "cost": "variable",
    "keywords": [
      "das simples",
      "darf",
      "imposto",
      "receita federal",
      "gps inss"
    ]
  },
  {
    "key": "pix-pessoas",
    "name": "Pix e transferências",
    "symbol": "arrow.left.arrow.right",
    "color": "#64B5F6",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": [
      "transferencia enviada",
      "pix enviado",
      "ted enviada",
      "doc enviado"
    ]
  },
  {
    "key": "outros",
    "name": "Outros",
    "symbol": "questionmark.circle",
    "color": "#78909C",
    "kind": "expense",
    "parent": null,
    "cost": "variable",
    "keywords": []
  },
  {
    "key": "investimentos",
    "name": "Investimentos",
    "symbol": "chart.line.uptrend.xyaxis",
    "color": "#26A69A",
    "kind": "transfer",
    "parent": null,
    "cost": "variable",
    "keywords": [
      "aplicacao",
      "resgate",
      "rdb",
      "cdb",
      "tesouro direto",
      "caixinha",
      "porquinho",
      "investimento",
      "poupanca"
    ]
  },
  {
    "key": "transferencia-interna",
    "name": "Transferência interna",
    "symbol": "arrow.triangle.swap",
    "color": "#4DD0E1",
    "kind": "transfer",
    "parent": null,
    "cost": "variable",
    "keywords": [
      "transferencia entre contas",
      "transferencia interna",
      "mesma titularidade"
    ]
  },
  {
    "key": "pagamento-fatura",
    "name": "Pagamento de fatura",
    "symbol": "creditcard",
    "color": "#80CBC4",
    "kind": "transfer",
    "parent": null,
    "cost": "variable",
    "keywords": [
      "pagamento de fatura",
      "pagamento recebido",
      "pagamento fatura",
      "pagto fatura",
      "pagamento on line",
      "pagamento da fatura",
      "inclusao de pagamento",
      "pgto fatura",
      "pag fatura",
      "pagamento cartao de credito",
      "pagamento de cartao",
      "pagto cartao credito",
      "deb aut fatura"
    ]
  },
  {
    "key": "saque",
    "name": "Saque (vira dinheiro)",
    "symbol": "banknote",
    "color": "#A5D6A7",
    "kind": "transfer",
    "parent": null,
    "cost": "variable",
    "keywords": [
      "saque",
      "saque 24h",
      "banco24horas"
    ]
  },
  {
    "key": "salario",
    "name": "Salário",
    "symbol": "briefcase",
    "color": "#4ADE80",
    "kind": "income",
    "parent": null,
    "cost": "variable",
    "keywords": [
      "salario",
      "folha de pagamento",
      "pagamento de salario",
      "proventos",
      "pro labore",
      "pro-labore"
    ]
  },
  {
    "key": "rendimentos",
    "name": "Rendimentos",
    "symbol": "percent",
    "color": "#22C55E",
    "kind": "income",
    "parent": null,
    "cost": "variable",
    "keywords": [
      "rendimento",
      "dividendo",
      "juros sobre capital",
      "cashback"
    ]
  },
  {
    "key": "outras-receitas",
    "name": "Outras receitas",
    "symbol": "arrow.down.circle",
    "color": "#86EFAC",
    "kind": "income",
    "parent": null,
    "cost": "variable",
    "keywords": [
      "transferencia recebida",
      "pix recebido",
      "reembolso",
      "ted recebida"
    ]
  }
];

export const merchantSeeds: MerchantSeed[] = [
  {
    "key": "ifood",
    "name": "iFood",
    "patterns": [
      "ifood",
      "ifd*"
    ],
    "emoji": "🍔",
    "color": "#EA1D2C",
    "category": "alim-delivery",
    "cost": null,
    "domain": "ifood.com.br"
  },
  {
    "key": "rappi",
    "name": "Rappi",
    "patterns": [
      "rappi"
    ],
    "emoji": "🛵",
    "color": "#FF441F",
    "category": "alim-delivery",
    "cost": null,
    "domain": "rappi.com.br"
  },
  {
    "key": "ze-delivery",
    "name": "Zé Delivery",
    "patterns": [
      "ze delivery"
    ],
    "emoji": "🍺",
    "color": "#F5B400",
    "category": "alim-delivery",
    "cost": null,
    "domain": "ze.delivery"
  },
  {
    "key": "mcdonalds",
    "name": "McDonald's",
    "patterns": [
      "mcdonald"
    ],
    "emoji": "🍟",
    "color": "#DA291C",
    "category": "alim-restaurante",
    "cost": null,
    "domain": "mcdonalds.com.br"
  },
  {
    "key": "starbucks",
    "name": "Starbucks",
    "patterns": [
      "starbucks"
    ],
    "emoji": "☕",
    "color": "#00704A",
    "category": "alim-padaria",
    "cost": null,
    "domain": "starbucks.com.br"
  },
  {
    "key": "uber",
    "name": "Uber",
    "patterns": [
      "uber"
    ],
    "emoji": "🚗",
    "color": "#2B2B2B",
    "category": "carro-apps",
    "cost": null,
    "domain": "uber.com"
  },
  {
    "key": "99",
    "name": "99",
    "patterns": [
      "99app",
      "99 tecnologia",
      "99 pop"
    ],
    "emoji": "🚕",
    "color": "#FFC800",
    "category": "carro-apps",
    "cost": null,
    "domain": "99app.com"
  },
  {
    "key": "sem-parar",
    "name": "Sem Parar",
    "patterns": [
      "sem parar"
    ],
    "emoji": "🛣️",
    "color": "#E4002B",
    "category": "carro-pedagio",
    "cost": null,
    "domain": "semparar.com.br"
  },
  {
    "key": "shell",
    "name": "Shell",
    "patterns": [
      "shell"
    ],
    "emoji": "⛽",
    "color": "#E8B500",
    "category": "carro-combustivel",
    "cost": null,
    "domain": "shell.com.br"
  },
  {
    "key": "ipiranga",
    "name": "Ipiranga",
    "patterns": [
      "ipiranga"
    ],
    "emoji": "⛽",
    "color": "#F2B705",
    "category": "carro-combustivel",
    "cost": null,
    "domain": "ipiranga.com.br"
  },
  {
    "key": "netflix",
    "name": "Netflix",
    "patterns": [
      "netflix"
    ],
    "emoji": "🎬",
    "color": "#E50914",
    "category": "ass-streaming",
    "cost": "fixed",
    "domain": "netflix.com"
  },
  {
    "key": "spotify",
    "name": "Spotify",
    "patterns": [
      "spotify"
    ],
    "emoji": "🎵",
    "color": "#1DB954",
    "category": "ass-streaming",
    "cost": "fixed",
    "domain": "spotify.com"
  },
  {
    "key": "disney",
    "name": "Disney+",
    "patterns": [
      "disney"
    ],
    "emoji": "🏰",
    "color": "#113CCF",
    "category": "ass-streaming",
    "cost": "fixed",
    "domain": "disneyplus.com"
  },
  {
    "key": "max",
    "name": "Max",
    "patterns": [
      "hbo",
      "max.com"
    ],
    "emoji": "📺",
    "color": "#5822B4",
    "category": "ass-streaming",
    "cost": "fixed",
    "domain": "max.com"
  },
  {
    "key": "prime-video",
    "name": "Prime Video",
    "patterns": [
      "prime video",
      "amazon prime"
    ],
    "emoji": "📦",
    "color": "#00A8E1",
    "category": "ass-streaming",
    "cost": "fixed",
    "domain": "primevideo.com"
  },
  {
    "key": "youtube",
    "name": "YouTube",
    "patterns": [
      "youtube"
    ],
    "emoji": "▶️",
    "color": "#FF0000",
    "category": "ass-streaming",
    "cost": "fixed",
    "domain": "youtube.com"
  },
  {
    "key": "apple",
    "name": "Apple",
    "patterns": [
      "apple.com",
      "icloud"
    ],
    "emoji": "🍎",
    "color": "#8E8E93",
    "category": "ass-apps",
    "cost": "fixed",
    "domain": "apple.com"
  },
  {
    "key": "google",
    "name": "Google",
    "patterns": [
      "google"
    ],
    "emoji": "🔎",
    "color": "#4285F4",
    "category": "ass-apps",
    "cost": null,
    "domain": "google.com"
  },
  {
    "key": "amazon",
    "name": "Amazon",
    "patterns": [
      "amazon"
    ],
    "emoji": "📦",
    "color": "#FF9900",
    "category": "compras-online",
    "cost": null,
    "domain": "amazon.com.br"
  },
  {
    "key": "mercado-livre",
    "name": "Mercado Livre",
    "patterns": [
      "mercado livre",
      "mercadolivre"
    ],
    "emoji": "🤝",
    "color": "#F2D600",
    "category": "compras-online",
    "cost": null,
    "domain": "mercadolivre.com.br"
  },
  {
    "key": "shopee",
    "name": "Shopee",
    "patterns": [
      "shopee"
    ],
    "emoji": "🛍️",
    "color": "#EE4D2D",
    "category": "compras-online",
    "cost": null,
    "domain": "shopee.com.br"
  },
  {
    "key": "magalu",
    "name": "Magalu",
    "patterns": [
      "magalu",
      "magazine luiza"
    ],
    "emoji": "🛒",
    "color": "#0086FF",
    "category": "compras-online",
    "cost": null,
    "domain": "magazineluiza.com.br"
  },
  {
    "key": "carrefour",
    "name": "Carrefour",
    "patterns": [
      "carrefour"
    ],
    "emoji": "🛒",
    "color": "#004E9F",
    "category": "alim-mercado",
    "cost": null,
    "domain": "carrefour.com.br"
  },
  {
    "key": "assai",
    "name": "Assaí",
    "patterns": [
      "assai"
    ],
    "emoji": "🛒",
    "color": "#E30613",
    "category": "alim-mercado",
    "cost": null,
    "domain": "assai.com.br"
  },
  {
    "key": "pao-de-acucar",
    "name": "Pão de Açúcar",
    "patterns": [
      "pao de acucar"
    ],
    "emoji": "🛒",
    "color": "#00843D",
    "category": "alim-mercado",
    "cost": null,
    "domain": "paodeacucar.com"
  },
  {
    "key": "drogasil",
    "name": "Droga Raia / Drogasil",
    "patterns": [
      "drogasil",
      "droga raia",
      "raia drogasil"
    ],
    "emoji": "💊",
    "color": "#E2001A",
    "category": "saude-farmacia",
    "cost": null,
    "domain": "drogasil.com.br"
  },
  {
    "key": "smart-fit",
    "name": "Smart Fit",
    "patterns": [
      "smart fit",
      "smartfit"
    ],
    "emoji": "💪",
    "color": "#F5B300",
    "category": "cuidados-academia",
    "cost": "fixed",
    "domain": "smartfit.com.br"
  },
  {
    "key": "cpfl",
    "name": "CPFL",
    "patterns": [
      "cpfl",
      "companhia paulista de forca"
    ],
    "emoji": "💡",
    "color": "#0057A8",
    "category": "casa-luz",
    "cost": "fixed",
    "domain": "cpfl.com.br"
  },
  {
    "key": "enel",
    "name": "Enel",
    "patterns": [
      "enel"
    ],
    "emoji": "💡",
    "color": "#0555FA",
    "category": "casa-luz",
    "cost": "fixed",
    "domain": "enel.com.br"
  },
  {
    "key": "sabesp",
    "name": "Sabesp",
    "patterns": [
      "sabesp"
    ],
    "emoji": "💧",
    "color": "#0077C8",
    "category": "casa-agua",
    "cost": "fixed",
    "domain": "sabesp.com.br"
  },
  {
    "key": "vivo",
    "name": "Vivo",
    "patterns": [
      "vivo"
    ],
    "emoji": "📶",
    "color": "#660099",
    "category": "casa-internet",
    "cost": "fixed",
    "domain": "vivo.com.br"
  },
  {
    "key": "claro",
    "name": "Claro",
    "patterns": [
      "claro"
    ],
    "emoji": "📶",
    "color": "#DA291C",
    "category": "casa-internet",
    "cost": "fixed",
    "domain": "claro.com.br"
  }
];

/** Categorias que o Inter manda na fatura → as nossas. */
export const bankCategoryMap: Record<string, string> = {
  "supermercado": "alim-mercado",
  "mercado": "alim-mercado",
  "restaurante": "alim-restaurante",
  "alimentacao": "alimentacao",
  "transporte": "carro",
  "combustivel": "carro-combustivel",
  "posto": "carro-combustivel",
  "saude": "saude",
  "farmacia": "saude-farmacia",
  "drogaria": "saude-farmacia",
  "vestuario": "compras-roupas",
  "compras": "compras",
  "lojas de departamento": "compras",
  "eletronicos": "compras-eletronicos",
  "servicos": "assinaturas",
  "entretenimento": "lazer",
  "lazer": "lazer",
  "viagem": "lazer-viagens",
  "turismo": "lazer-viagens",
  "educacao": "educacao",
  "casa": "casa",
  "moradia": "casa-moradia",
  "pets": "pets",
  "beleza": "cuidados-beleza",
  "outros": "outros",
  "supermercados": "alim-mercado",
  "restaurantes": "alim-restaurante",
  "restaurante / lanchonete / bar": "alim-restaurante",
  "posto de combustivel": "carro-combustivel",
  "departamento": "compras",
  "farmacias": "saude-farmacia",
  "hotelaria": "lazer-viagens",
  "hoteis": "lazer-viagens",
  "cia aereas": "lazer-viagens",
  "companhias aereas": "lazer-viagens"
};

export const kindName: Record<CategoryKind, string> = { expense: 'Despesa', income: 'Receita', transfer: 'Transferência entre contas' };
export const costName: Record<CostType, string> = { fixed: 'Fixo', variable: 'Variável' };

export function seedFor(key: string): CategorySeed | undefined {
  return categorySeeds.find((seed) => seed.key === key);
}
