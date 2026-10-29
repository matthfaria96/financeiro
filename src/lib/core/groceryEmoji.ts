/**
 * Figurinha de cada item da lista pelo nome, com um leque grande do que se compra no mercado, farmácia e petshop.
 * Primeiro procura a palavra exata; se não achar, aceita erro de digitação ("mioijo", "fejão", "arros", "detergemte").
 * A ordem importa: o mais específico vem antes ("leite condensado" antes de "leite", "pasta de dente" antes de "pasta").
 */
const rules: [string[], string][] = [
  // Laticínios e frios
  [['leite condensado', 'creme de leite', 'doce de leite'], '🥫'], [['leite', 'iogurte', 'bebida lactea', 'coalhada', 'kefir', 'danone', 'danoninho', 'yakult'], '🥛'],
  [['queijo', 'mussarela', 'muçarela', 'requeijao', 'parmesao', 'ricota', 'cheddar', 'catupiry', 'provolone', 'cream cheese', 'polenguinho'], '🧀'],
  [['manteiga', 'margarina', 'ghee'], '🧈'], [['ovo', 'ovos', 'gema', 'clara'], '🥚'],
  // Padaria e massas
  [['pao de queijo'], '🧀'], [['pao', 'bisnaguinha', 'torrada', 'baguete', 'brioche', 'croissant', 'sonho', 'rosca', 'wrap', 'tortilha', 'sanduiche', 'misto'], '🍞'],
  [['bolo', 'torta', 'cupcake', 'brownie', 'panetone', 'chocotone'], '🍰'], [['biscoito', 'bolacha', 'cookie', 'cream cracker', 'wafer', 'rosquinha', 'salgadinho', 'chips', 'doritos', 'ruffles', 'cheetos'], '🍪'],
  [['miojo', 'lamen', 'ramen', 'cup noodles', 'nissin', 'macarrao instantaneo'], '🍜'],
  [['macarrao', 'massa', 'espaguete', 'lasanha', 'penne', 'parafuso', 'talharim', 'nhoque', 'ravioli', 'capeletti', 'fusilli'], '🍝'],
  [['pastel', 'coxinha', 'esfiha', 'empada', 'salgado', 'quibe', 'kibe'], '🥟'], [['pizza'], '🍕'], [['hamburguer', 'burger', 'hamburger'], '🍔'], [['cachorro quente', 'hot dog'], '🌭'],
  [['farinha', 'aveia', 'fuba', 'trigo', 'polvilho', 'tapioca', 'goma', 'amido', 'maizena', 'granola', 'cereal', 'sucrilhos', 'farofa', 'mandioca', 'aipim', 'macaxeira'], '🌾'],
  // Básicos e mercearia
  [['arroz'], '🍚'], [['feijao', 'lentilha', 'grao de bico', 'ervilha', 'soja'], '🫘'],
  [['acucar', 'adocante', 'mel', 'melado', 'rapadura'], '🍯'], [['sal', 'sal grosso'], '🧂'],
  [['oleo', 'azeite', 'vinagre'], '🫒'], [['molho', 'extrato de tomate', 'catchup', 'ketchup', 'maionese', 'mostarda', 'shoyu', 'tempero', 'caldo', 'sazon', 'knorr', 'oregano', 'colorau', 'cominho', 'canela', 'louro'], '🥫'],
  [['enlatado', 'lata', 'milho verde', 'seleta', 'palmito', 'azeitona', 'conserva'], '🥫'],
  [['cafe', 'capsula', 'nescafe', 'pilao', 'melitta'], '☕'], [['cha', 'mate', 'camomila', 'erva doce', 'hibisco'], '🍵'],
  [['chocolate', 'achocolatado', 'nescau', 'toddy', 'bombom', 'barra de cereal', 'kit kat', 'trufa'], '🍫'], [['bala', 'chiclete', 'pirulito', 'doce', 'goiabada', 'paçoca', 'pacoca', 'gelatina', 'pudim'], '🍬'],
  [['amendoim', 'castanha', 'noz', 'nozes', 'amendoa', 'pistache', 'semente', 'chia', 'linhaca'], '🥜'], [['pipoca'], '🍿'],
  // Carnes e peixes
  [['frango', 'peito de frango', 'coxa', 'sobrecoxa', 'asa', 'file de frango', 'galinha', 'chester', 'peru'], '🍗'],
  [['carne', 'patinho', 'alcatra', 'picanha', 'acem', 'costela', 'bife', 'maminha', 'fraldinha', 'contra file', 'file mignon', 'musculo', 'cupim', 'moida', 'carne seca', 'charque', 'figado', 'cordeiro', 'porco', 'lombo', 'pernil', 'bisteca'], '🥩'],
  [['linguica', 'salsicha', 'bacon', 'presunto', 'salame', 'mortadela', 'peito de peru', 'calabresa', 'paio', 'blanquet'], '🥓'],
  [['peixe', 'tilapia', 'salmao', 'atum', 'sardinha', 'bacalhau', 'merluza', 'pescada', 'polvo', 'lula'], '🐟'], [['camarao', 'marisco', 'mexilhao', 'siri', 'caranguejo'], '🦐'],
  // Frutas
  [['banana'], '🍌'], [['maca'], '🍎'], [['laranja', 'mexerica', 'tangerina', 'ponkan', 'bergamota'], '🍊'], [['limao', 'lima'], '🍋'],
  [['uva', 'passas'], '🍇'], [['morango', 'framboesa', 'amora', 'mirtilo', 'acai'], '🍓'], [['melancia'], '🍉'], [['melao'], '🍈'], [['abacaxi'], '🍍'],
  [['manga'], '🥭'], [['pera'], '🍐'], [['pessego', 'nectarina', 'ameixa'], '🍑'], [['cereja'], '🍒'], [['coco'], '🥥'], [['abacate'], '🥑'],
  [['mamao', 'kiwi', 'goiaba', 'maracuja', 'caqui', 'fruta', 'frutas', 'figo', 'pitaya', 'carambola'], '🥝'],
  // Legumes e verduras
  [['tomate'], '🍅'], [['batata', 'batata doce', 'inhame', 'cara', 'mandioquinha', 'beterraba'], '🥔'], [['cenoura'], '🥕'], [['cebola', 'alho', 'cebolinha', 'alho poro'], '🧅'],
  [['alface', 'rucula', 'couve', 'espinafre', 'verdura', 'salada', 'agriao', 'repolho', 'acelga', 'salsinha', 'cheiro verde', 'coentro', 'manjericao', 'hortela'], '🥬'],
  [['brocolis', 'couve flor'], '🥦'], [['pepino', 'abobrinha', 'chuchu', 'quiabo', 'jilo', 'vagem', 'maxixe'], '🥒'], [['berinjela'], '🍆'], [['abobora', 'moranga'], '🎃'],
  [['pimentao', 'pimenta'], '🫑'], [['milho'], '🌽'], [['cogumelo', 'champignon', 'shimeji', 'shitake'], '🍄'], [['gengibre'], '🫚'],
  // Bebidas e congelados
  [['agua', 'agua com gas', 'galao'], '💧'], [['refrigerante', 'refri', 'coca', 'guarana', 'fanta', 'sprite', 'pepsi', 'soda', 'tonica'], '🥤'],
  [['suco', 'nectar', 'del valle', 'ades'], '🧃'], [['cerveja', 'chopp', 'brahma', 'skol', 'heineken', 'amstel', 'budweiser', 'stella'], '🍺'],
  [['vinho', 'espumante', 'champanhe', 'sidra'], '🍷'], [['cachaca', 'vodka', 'whisky', 'gin', 'rum', 'licor', 'tequila'], '🥃'], [['energetico', 'red bull', 'monster', 'isotonico', 'gatorade'], '⚡'],
  [['sorvete', 'picole', 'acai na tigela'], '🍦'], [['gelo'], '🧊'], [['congelado', 'lasanha congelada', 'nuggets', 'empanado', 'batata frita'], '🍟'],
  // Limpeza e casa
  [['papel higienico', 'papel toalha', 'guardanapo', 'lenco de papel'], '🧻'],
  [['detergente', 'sabao', 'sabao em po', 'amaciante', 'desinfetante', 'agua sanitaria', 'cloro', 'limpador', 'multiuso', 'alvejante', 'veja', 'pinho sol', 'lustra moveis', 'tira manchas', 'vanish', 'omo', 'ype'], '🧴'],
  [['esponja', 'pano', 'flanela', 'bombril', 'palha de aco', 'rodo', 'vassoura', 'balde', 'luva'], '🧽'],
  [['saco de lixo', 'lixo', 'sacola'], '🗑️'], [['papel aluminio', 'filme plastico', 'papel manteiga', 'pote', 'marmita', 'copo descartavel', 'prato descartavel', 'talher descartavel', 'palito'], '📦'],
  [['inseticida', 'repelente', 'baygon', 'raid', 'naftalina'], '🦟'], [['pilha', 'bateria', 'lampada'], '💡'], [['vela', 'fosforo', 'isqueiro', 'carvao'], '🕯️'], [['flor', 'flores', 'planta', 'vaso', 'adubo', 'terra'], '💐'],
  // Higiene e farmácia
  [['pasta de dente', 'creme dental', 'escova de dente', 'fio dental', 'enxaguante', 'listerine'], '🪥'],
  [['shampoo', 'xampu', 'condicionador', 'sabonete', 'creme', 'hidratante', 'desodorante', 'perfume', 'colonia', 'gel', 'mascara de cabelo', 'oleo corporal'], '🧼'],
  [['absorvente', 'protetor diario', 'coletor'], '🌸'], [['aparelho de barbear', 'gilete', 'lamina', 'espuma de barbear', 'cotonete', 'acetona', 'esmalte', 'batom', 'maquiagem', 'base', 'rimel'], '💄'],
  [['fralda', 'lenco umedecido', 'pomada de assadura', 'mamadeira', 'chupeta', 'papinha', 'formula', 'leite em po', 'nan', 'aptamil'], '👶'],
  [['remedio', 'dipirona', 'vitamina', 'paracetamol', 'ibuprofeno', 'xarope', 'pomada', 'antialergico', 'dorflex', 'neosaldina', 'buscopan', 'omeprazol', 'antibiotico', 'colirio', 'soro', 'termometro', 'teste de gravidez', 'anticoncepcional', 'suplemento', 'whey', 'creatina'], '💊'],
  [['protetor solar', 'protetor', 'curativo', 'band-aid', 'gaze', 'algodao', 'esparadrapo', 'alcool', 'agua oxigenada', 'mertiolate'], '🩹'], [['mascara'], '😷'],
  // Pets
  [['racao', 'petisco', 'sache', 'areia', 'coleira', 'antipulgas', 'vermifugo', 'tapete higienico', 'osso', 'bifinho', 'whiskas', 'pedigree', 'golden', 'premier'], '🐾'],
  [['brinquedo', 'bolinha', 'pelucia', 'arranhador'], '🧸'],
  // Papelaria e outros
  [['caderno', 'caneta', 'lapis', 'borracha', 'cola', 'fita adesiva', 'papel sulfite', 'envelope', 'tesoura'], '✏️'], [['presente', 'embrulho', 'cartao'], '🎁']
];

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const folded: [string[], string][] = rules.map(([words, emoji]) => [words.map(fold), emoji]);
const phrases: { word: string; emoji: string }[] = folded.flatMap(([words, emoji]) => words.filter((w) => w.includes(' ')).map((word) => ({ word, emoji })));
const singles: { word: string; emoji: string }[] = folded.flatMap(([words, emoji]) => words.filter((w) => !w.includes(' ') && w.length >= 4).map((word) => ({ word, emoji })));

/** Distância de edição com troca de letras vizinhas ("fejiao" ↔ "feijao" = 1). Para cedo se passar do limite. */
function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      best = Math.min(best, d[i][j]);
    }
    if (best > limit) return limit + 1;
  }
  return d[a.length][b.length];
}

const cache = new Map<string, string>();

export function groceryEmoji(name: string): string {
  const text = ` ${fold(name)} `;
  const hit = cache.get(text);
  if (hit) return hit;
  let found = '';
  // 1) Palavra certa: curta (sal, chá, ovo) só inteira ou no plural; as outras pelo começo da palavra.
  for (const [words, emoji] of folded) {
    if (words.some((w) => (w.length <= 3 ? text.includes(` ${w} `) || text.includes(` ${w}s `) : text.includes(` ${w}`)))) { found = emoji; break; }
  }
  // 2) Erro de digitação: cada palavra do item contra as palavras conhecidas (mesma primeira letra, 1 erro; 2 em palavras longas).
  if (!found) {
    let best = Infinity;
    // Nome de duas palavras com erro ("papel higienco"): compara o nome inteiro com as expressões conhecidas.
    const whole = text.trim();
    for (const { word, emoji } of phrases) {
      if (word[0] !== whole[0]) continue;
      const d = distance(whole, word, 2);
      if (d <= 2 && d < best) { best = d; found = emoji; }
    }
    for (const part of text.trim().split(' ').filter((p) => p.length >= 4)) {
      const limit = part.length >= 7 ? 2 : 1;
      for (const { word, emoji } of singles) {
        if (word[0] !== part[0]) continue;
        const d = distance(part, word, limit);
        if (d <= limit && d < best) { best = d; found = emoji; }
      }
    }
  }
  found ||= '🛒';
  cache.set(text, found);
  return found;
}
