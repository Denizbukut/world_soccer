-- Add position column to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS position VARCHAR(20);

-- Update positions for all players based on their characteristics
-- Goalkeepers (GK)
UPDATE cards SET position = 'GK' WHERE name IN (
  'Courtois', 'Kobel', 'ter Stegen', 'Alisson', 'Donarumma', 'Maignan', 
  'Lafont', 'Pope', 'Butez', 'Onana', 'Neuer', 'Lopes'
);

-- Strikers (ST)
UPDATE cards SET position = 'ST' WHERE name IN (
  'Haaland', 'Kane', 'Lewandowski', 'Lacazette', 'Vardy', 'Beier', 
  'Openda', 'Goncalo Ramos', 'Boniface', 'Lukaku', 'Sorloth', 'Isak',
  'Cristiano Ronaldo', 'Messi', 'Puskás', 'Cruyff', 'Endrick', 'Vitor Roque',
  'Moukoko', 'Tel', 'Amoura', 'Kleindienst', 'Undav', 'Guirassy',
  'Solanke', 'Akpom', 'Ünal', 'Griezmann', 'Becker', 'Gerard Moreno', 'Gouiri', 'Thuram', 'Martinez', 'Alvarez'
);

-- Midfielders (MF)
UPDATE cards SET position = 'MF' WHERE name IN (
  'Wirtz', 'Szoboszlai', 'Maddison', 'Smith Rowe', 'Gnabry',
  'Doue', 'Fermín', 'Riquelme', 'Antony', 'Kluivert', 'Mbeumo',
  'Kulusevski', 'Yeremy Pino', 'Januzaj', 'McTominay', 'Pulisic', 'Nmecha', 'Bruno Fernandes', 'Tonali',
  'Madueke', 'Rice', 'Valverde', 'Kvaratskhelia', 'Doan', 'Mikel Merino', 'Eze',
  'Anton', 'Grimaldo', 'Bryan Gil', 'Iwobi', 'Aleix Garcia.', 'Politano',
  'Gilmour', 'Greenwood', 'Goncalo Guedes', 'Brekalo', 'Vermeeren', 'Olise', 'De bruyne',
  'Diaz', 'Kubo', 'Foden', 'Rafael Leao', 'Simons', 'Golovin', 'Danjuma', 'Nico Williams',
  'Gakpo', 'Raphinha', 'Arnold.', 'Cataldi', 'Elliott', 'Majer', 'Aebischer', 'Loftus-Cheek', 'Zaïre-Emery',
  'Lamine Yamal', 'Zaniolo', 'Brandt', 'Kimmich', 'Vitinha', 'Lavia', 'Güler', 'Dembele', 'March', 'Arthur',
  'Pavard', 'Tella', 'Saka', 'Hack', 'Yan Couto', 'Sangare', 'Lukebakio', 'Dinkci', 'Williams', 'Barcola', 'Chaïbi.'
);

-- Defenders (DF)
UPDATE cards SET position = 'DF' WHERE name IN (
  'Rüdiger', 'Eder-Militao', 'Le Normand', 'Dragusin', 'Quansah',
  'Kounde', 'Darmian', 'Kalulu', 'Thiaw', 'Bremer', 'Kiwior',
  'Alexander-Arnold', 'Anton', 'Aina', 'Clauss', 'Di Lorenzo', 'Kim Min Jae',
  'Ruben Dias', 'Marquinhos', 'Pedro Porro', 'Hakimi', 'Gvardiol', 'Alderete', 'Kerkez', 'Merlin', 'Williams',
  'Tsimikas', 'Buongiorno', 'Schär', 'Nuno Mendes', 'Diogo Dalot', 'Kimpembe', 'Zabarnyi', 'Kimmich', 'Bastoni', 'Tah',
  'Kehrer', 'van Dijk', 'Hincapie', 'Pavard', 'Teze', 'Bradley', 'Colwill',
  'Bisseck', 'Boscagli', 'Davies', 'Hateboer', 'Dimarco', 'Medina'
);

-- Set remaining players to MF (Midfield) as default
UPDATE cards SET position = 'MF' WHERE position IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(position);

-- Show summary of positions
SELECT position, COUNT(*) as count 
FROM cards 
GROUP BY position 
ORDER BY count DESC; 