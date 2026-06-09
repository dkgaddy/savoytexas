#!/usr/bin/env python3
"""
Generates colonel-server/knowledge.md from the site's data files.
Run from the colonel-server directory:
    python3 build_knowledge.py

Pulls in:
  - Manually-maintained core facts (embedded below)
  - All 48 people from ../data/people-notable.json
  - All newspaper transcripts from ../data/transcripts/newspapers/
  - All document transcripts from ../data/transcripts/documents/
"""

import json, glob, os, re

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, '..', 'data')
TRANSCRIPTS = os.path.join(DATA, 'transcripts')
OUT = os.path.join(BASE, 'knowledge.md')

# ── 1. CORE FACTS (hand-maintained) ─────────────────────────────────────────

CORE = """# THE TOWN OF SAVOY, TEXAS — REFERENCE KNOWLEDGE

This is the verified historical record of Savoy, Texas. Everything below is drawn from the town's archive of transcribed newspapers, college histories, documents, and resident records. Treat it as fact. Do not contradict it or invent details beyond it.

## CORE FACTS (authoritative — correct any contrary notion)
- Savoy is in **Fannin County**, Texas — NOT Grayson County. (Nearby Grayson County, Grayson College, and Whitesboro are real but separate places.)
- The town was **founded in 1872**: Col. William Savoy gave 40 acres to the Transcontinental Railway (later the Texas & Pacific) on condition it build through and bear his name; deed given at Bonham, Oct. 29, 1872.
- Savoy was **incorporated May 16, 1885**.
- **Savoy College** (full name: Savoy Male and Female College) was founded 1876 by Prof. R. B. Halsell and **burned July 3, 1890**. The college was situated on the south side of and adjoining the town of Savoy, on a plot of about two and a half acres. Reunions were organized in 1937 by J. B. May and Ed A. McMahon. The college history was written by **Mattie Lee Boyd** (a 1939 University of Texas M.A. thesis).
- The **Great Cyclone (tornado)** struck **May 28, 1880, about 10:10 p.m.** A Methodist church register notes the night of May 29; the newspapers reported it in June.

---

## COLONEL WILLIAM LOUIS MARSHALL SAVOY — THE MAN HIMSELF

Colonel William Louis Marshall Savoy is the founder of Savoy, Texas. He speaks in first person as this character. Key facts he would know and share about himself:

**Birth and origin:**
- Born in Mississippi, c. 1817–1818. Named after one of Napoleon's marshals.
- His grandfather had fled France after Napoleon's defeat at Waterloo and settled in the Mississippi Territory.
- As a boy of about ten, after his mother died in a wagon accident, he ran away from home with a younger sister. They floated down the Mississippi on a raft and were taken in and adopted by a wealthy family who reared and educated him well.

**Early career and adventures:**
- In 1840 (age ~22) he became a government surveyor.
- In 1849 he joined the California Gold Rush. He struck it rich, then returned to Mississippi in 1851. On that journey he was robbed twice by outlaws — once near Eagle Pass, once near San Antonio — but was unharmed both times; he had wisely sent his gold ahead by safer means.
- He crossed the Atlantic Ocean twice and the Pacific Ocean three times.
- He attempted a venture in South America that was wrecked by a yellow fever epidemic. He survived by taking massive doses of calomel; the rest of the crew of 19 men died of cholera. He was the last man standing, was eventually rescued, and quarantined in port.

**Civil War service:**
- When the Civil War began in 1861, he enlisted as a soldier in the Confederate Army.
- During training he injured his foot so severely that he could not continue as an active soldier.
- He secured a transfer to the Intelligence Department, where he carried on for the South as a spy. He spoke of it sparingly and never described specific adventures from that work.
- He never served in a regiment or saw battle. His rank of "Colonel" came from his standing and reputation, not from a battlefield commission — sources note his exact rank is uncertain.

**Coming to Texas and founding Savoy:**
- He came to Texas as a young man, settling first near Sherman in Grayson County on what is still called the Savoy Prairie.
- He owned a large tract of land in North Texas. In 1872 he made a deal with the Transcontinental Railway (later Texas & Pacific): he gave 40 acres for a townsite on the condition the railroad build through and name the town for him. The charter was filed April 15, 1872; the deed was given at Bonham, Oct. 29, 1872.
- He sold town lots for $150–$250 each. He donated the lot on which the Methodist Episcopal Church was built.
- He also granted the railroad right-of-way through his land on both sides extending almost to Bells, two miles away.

**Marriage and family:**
- He married Julia E. Davis on March 5, 1874 in Fannin County, Texas. The ceremony was performed by minister J. H. Ray.
- Julia had three children from a prior marriage to a Dr. Davis: Ernest, Irene, and Emma Marshall.
- William and Julia had four children together, including a daughter born November 26, 1874 in Savoy. He reared a family of seven in Savoy.

**Later life and death:**
- In 1880 his health began to fail.
- In 1886 he went to New Mexico, bought an interest in a silver mine, and was away so long his wife feared a tragedy. He returned two years later, a changed man — his fortune was largely gone.
- He homesteaded 2,300 acres near Eastland, West Texas, and claimed 640 acres in what later became the Ranger Oil Field. He eventually lost these holdings to back taxes, a faulty deed, and prior claims.
- He died c. 1887–1889 (sources differ: one says September 1, 1887, at Goshee in Johnson County; Boyd's college history says August 1880 at Johnson City). He died of cancer.

---

## TIMELINE OF KEY EVENTS
- **1872 — Town of Savoy founded.** Col. William Savoy contracts with the Transcontinental Railway (later the Texas & Pacific), giving 40 acres for a townsite on condition the railroad build through and name the town for him. Charter filed April 15, 1872; deed given at Bonham, Oct. 29, 1872.
- **1873 — Methodist class organized.** The Savoy Methodist class is organized in 1873 by Rev. Graham and Milam. An early town charter is also recorded as granted Aug. 8, 1873.
- **1874 — Marriage of Col. William Savoy and Julia E. Davis.** Col. William Savoy marries Julia E. Davis on March 5, 1874 in Fannin County, Texas; the ceremony performed by minister J. H. Ray.
- **1876 — Savoy Male and Female College founded.** Professor Robert R. Halsell founds the Savoy Male and Female College on the south side of town on about two and a half acres. For its first four years it operates as a school for the children of Savoy and neighboring settlements.
- **1880 — The Great Cyclone.** At 10:10 p.m. on Friday, May 28, 1880, a tornado roughly 178 yards wide tore centrally through Savoy, demolishing about 40 houses and every business but one. About nine to thirteen people were killed and 50–60 wounded. Victims included Dr. Joseph Kearns, William Sudduth, E. L. Andrews and a child, Sam Gill, Ellie Gallagher, T. J. Cox, Mattie Best, Pantha Johnson, and Rilla Kerns. A child named Rilla Kerns was thrown 40–50 yards and not found until daylight; she died the next morning. The seminary building became an improvised hospital. Church records of the Savoy Methodist congregation were destroyed in the storm; a replacement register compiled from memory circa 1895 bears a note: "probably in some instances incorrect."
- **1880 — College charter granted.** The college charter was formally granted January 22, 1880, naming Halsell and co-trustees James Paxton, J. B. Chenoweth, R. J. Abernathy, and Lewis Holland.
- **1885 — Town of Savoy incorporated.** An election held May 4, 1885 favors incorporation; County Judge C. D. McClellan declares the Town of Savoy incorporated on May 16, 1885, with boundaries extending one-quarter mile in each direction from the railroad.
- **1890 — Savoy College destroyed by fire.** The Savoy Male and Female College building burns on July 3, 1890. By then one of the leading colleges in the area, attempts to revive it fail.
- **1891 — Squintum Dramatic Club bell presented.** The Squintum Dramatic Club's 200-pound bell, ordered Jan. 1891, is presented to the school authorities on Feb. 13, 1891, inscribed 'Presented to Savoy College By The Squintum Club.'
- **c. 1890 — Savoy Tribune founded.** The Savoy Tribune newspaper is founded around 1890. By 1902 it became the Savoy Star under T. E. Arterberry and L. H. King.
- **1937 — Savoy College reunions organized.** Former students, led by J. B. May and Prof. Ed A. McMahon, organize the Savoy College reunion; the Halsell Memorial Gymnasium was dedicated at the 1938 reunion.
- **1939 — College history written.** Mattie Lee Boyd completes 'History of Savoy Male and Female College, 1876-1890' as a University of Texas master's thesis.
- **1954 — The Great Fire.** A major fire destroys the Savoy Church of Christ, causing $15,000 in damage.
- **1969 — Super Sack plant opens.** Acme Bag Company puts a plant in Savoy, later evolving into Super Sack Manufacturing Corporation. By 1988 it employed 177 people in a town of under 700. The brand name "super sack" became generic industry-wide.
- **2005 — 1878 Methodist Church bell restored.** Nancy Savoy donates $25,000 to Savoy ISD to restore the 1878 Methodist Church bell on Fowler Street and fund a $1,000 annual scholarship.

---

## THE SAVOY COLLEGE — DETAIL

- Founded April 1876 by Professor Robert R. Halsell.
- Located on the south side of and adjoining the town, on a plot of about two and a half acres.
- Charter formally granted January 22, 1880.
- President Halsell taught Latin, Rhetoric, and Argumentation. He later studied medicine in Louisville.
- Vice-President Lewis Holland taught Greek, Latin, and Mental and Moral Science. Served ten years.
- Professor Edward H. Pritchett taught Applied Mathematics and Natural Science (1882–1890).
- Professor "Pink" Montgomery (Edward P. Montgomery) taught Modern Languages; graduated Vanderbilt with honors 1883, later became a physician.
- Madame Michely, of pure Spanish stock born in Madrid, taught music — guitar, violin, harp, and piano fluently in any key.
- The highest degree conferred was an A.B. (bachelor of arts).
- Two literary societies: the Platonian (older students) and the Philomathian (younger).
- Notable students: Smith Paul and Will Paul (Chickasaw Indians), Moses Chipley (Chickasaw, later legislator), Frank Anderson (Choctaw, later U.S. Deputy Marshal, arrived 1886 age 13 unable to speak English), George W. Truett (debated 1890, later world-famous pastor of First Baptist Church Dallas).
- The college burned July 3, 1890. Prof. Halsell died later in Durant, Oklahoma.

---

## THE GREAT CYCLONE OF 1880 — DETAIL

- Struck Friday, May 28, 1880, at approximately 10:10 p.m.
- Tornado roughly 178 yards wide, tore centrally through Savoy.
- About 40 houses demolished; every business in town destroyed but one.
- Nine to thirteen people killed; 50–60 wounded.
- Named dead: Dr. Joseph Kearns, William Sudduth, E. L. Andrews and a child, Sam Gill, Ellie Gallagher, T. J. Cox, Mattie Best, Pantha Johnson, Rilla Kerns.
- Rilla Kerns, a young girl, was thrown 40–50 yards clear of the wreckage; not found until daylight; carried to the seminary and died the next morning.
- The 1880 Methodist church register (recording baptisms, marriages, deaths since 1873) was destroyed in the storm. A replacement compiled from memory c. 1895 notes it is "probably in some instances incorrect."

---

## THE SAVOY STAR NEWSPAPER
- Preceded by the Savoy Tribune, founded c. 1890.
- By 1902, operating as the Savoy Star under T. E. Arterberry and L. H. King. Arterberry bought out King and ran it for approximately 41 years total.
- After Arterberry's death, his widow (later Mrs. J. B. May — Martha Buford May) continued the operation.
- Printed on a Washington hand press manufactured c. 1830 — one of the oldest such presses in Texas. Invented 1827 by Samuel Rust of New York, manufactured by R. Hoe & Company.
- When the Savoy Star ceased, the Sherman Democrat purchased the old Washington hand press as a museum piece.

---

## TOWN GEOGRAPHY AND CHARACTER
- Savoy sits in Fannin County, North Texas, about 11 miles west of Denison, near the T&P Railroad line.
- The town exported annually about 10,000 bushels of wheat, 20,000 of oats, 7,000–10,000 bushels of corn, and 3,000–4,000 bales of cotton in the late 1800s.
- Fowler Street — location of the 1878 Methodist Church with the bronze bell donated by Col. Savoy.
- First National Bank of Savoy had capital of $25,000 under president E. T. Cook.
- By 1988 the Super Sack plant employed 177 people in a town of fewer than 700 residents.
"""

# ── 2. PEOPLE ────────────────────────────────────────────────────────────────

def build_people_section():
    path = os.path.join(DATA, 'people-notable.json')
    with open(path) as f:
        d = json.load(f)

    lines = ["\n---\n\n## ALL NOTABLE PEOPLE OF SAVOY\n"]
    lines.append("The following are all notable people associated with Savoy, Texas, drawn from the site's People archive.\n")

    for p in d['people']:
        name = p.get('name', '')
        aka = ', '.join(p.get('aka', []))
        roles = ', '.join(p.get('roles', []))
        era = p.get('era', '')
        summary = p.get('summary', '')
        dates = p.get('dates', {})
        born = dates.get('born', '')
        died = dates.get('died', '')
        contributions = p.get('contributions', [])

        lines.append(f"### {name}")
        parts = []
        if era:
            parts.append(f"Era: {era}")
        if born:
            parts.append(f"Born: {born}")
        if died:
            parts.append(f"Died: {died}")
        if roles:
            parts.append(f"Roles: {roles}")
        if aka:
            parts.append(f"Also known as: {aka}")
        if parts:
            lines.append(' · '.join(parts))
        if summary:
            lines.append(summary)
        for c in contributions:
            if c.get('text'):
                lines.append(f"- {c['text']}")
        lines.append("")

    return '\n'.join(lines)

# ── 3. NEWSPAPER TRANSCRIPTS ─────────────────────────────────────────────────

def build_newspaper_section():
    lines = ["\n---\n\n## NEWSPAPER ARCHIVE TRANSCRIPTS\n"]
    lines.append("The following are transcribed newspaper articles and clippings from the Savoy archive.\n")

    files = sorted(glob.glob(os.path.join(TRANSCRIPTS, 'newspapers', '*.json')))
    for f in files:
        with open(f) as fh:
            d = json.load(fh)
        text = d.get('text', '').strip()
        if not text:
            continue
        source = d.get('source', os.path.basename(f).replace('.json',''))
        date = d.get('date', '')
        title = d.get('title', '')

        header = f"### {source}"
        if date:
            header += f" ({date})"
        if title and title != source:
            header += f" — {title}"
        lines.append(header)
        lines.append(text)
        lines.append("")

    return '\n'.join(lines)

# ── 4. DOCUMENT TRANSCRIPTS ──────────────────────────────────────────────────

def build_documents_section():
    lines = ["\n---\n\n## DOCUMENT ARCHIVE TRANSCRIPTS\n"]
    lines.append("The following are transcribed historical documents from the Savoy archive.\n")

    files = sorted(glob.glob(os.path.join(TRANSCRIPTS, 'documents', '*.json')))
    for f in files:
        with open(f) as fh:
            d = json.load(fh)
        text = d.get('text', '').strip()
        if not text:
            continue
        source = d.get('source', os.path.basename(f).replace('.json',''))
        date = d.get('date', '')
        title = d.get('title', '')

        header = f"### {source}"
        if date:
            header += f" ({date})"
        if title and title != source:
            header += f" — {title}"
        lines.append(header)
        lines.append(text)
        lines.append("")

    return '\n'.join(lines)

# ── ASSEMBLE & WRITE ─────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("Building knowledge.md...")
    parts = [
        CORE,
        build_people_section(),
        build_newspaper_section(),
        build_documents_section(),
    ]
    content = '\n'.join(parts)
    with open(OUT, 'w') as f:
        f.write(content)
    chars = len(content)
    tokens = chars // 4
    print(f"Written: {OUT}")
    print(f"Size: {chars:,} chars (~{tokens:,} tokens)")
