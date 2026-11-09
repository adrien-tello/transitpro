# Unified class diagram (whole group)

| File | For |
|---|---|
| [unified-class-diagram.png](unified-class-diagram.png) | **The requirements document.** All 21 classes and links, key attributes, large text |
| [unified-class-diagram-enumerations.png](unified-class-diagram-enumerations.png) | Companion page: every enumeration (Role, ParcelStatus...) |
| [unified-class-diagram-full.png](unified-class-diagram-full.png) | Annex / screen: every attribute and operation |

SVG versions are next to each PNG (sharp at any zoom).

The 21 classes of the central database, grouped in one package per module, with the owner of each module.
It goes in the requirements document (FRD), section "Data model".

How to read it:
- **«tenant»** classes belong to exactly one Agency (`agencyId`); those 11 links to Agency are not drawn.
- An attribute typed with a class (`actor: Employee`, `origin: Branch`) is an association shown as an attribute.
- The box on the right lists the rules that connect the modules (Fleet → Booking, HR → Booking, ... → Finance).
- Each member's own module diagram shows every field of their classes.

Source of truth: `server/prisma/schema.prisma`. If the schema changes, the diagram is redrawn.
