import zipfile
from lxml import etree
from kanji_parts import all_parts

kanjivg = zipfile.ZipFile("kanjivg.zip")
kvg_ns = {"kvg": "http://kanjivg.tagaini.net", "svg": "http://www.w3.org/2000/svg"}

def num_strokes(el: etree._Element):
    return len(el.xpath(".//svg:path", namespaces=kvg_ns))

def get_element(node: etree._Element):
    el = node.xpath("./@kvg:element", namespaces=kvg_ns)
    return el[0] if el else None

class Elem:
    def __init__(self, char, strokes, is_radical=False):
        self.char = char
        self.strokes = strokes
        self.is_radical = is_radical
        pass
    def __repr__(self):
        return f"E({self.char},{self.strokes})"

def _get_elements(root: etree._Element):
    main_elem = get_element(root)

    if not main_elem or main_elem and main_elem not in all_parts:
        all_elems = []
        for e in root.getchildren():
            elem = get_element(e)

            # part = e.xpath("./@kvg:part", namespaces=kvg_ns)
            # if part and part[0] and part[0] != "1":
            #     print(all_elems, elem, part[0])
            #     next(p for p in all_elems if p[0] == elem)[1] += ns
            #     continue
            is_radical = len(e.xpath("./@kvg:radical", namespaces=kvg_ns)) > 0
            if is_radical:
                continue

            ns = num_strokes(e)
            elems = [Elem(elem, ns, is_radical=is_radical)] if elem else _get_elements(e)
            if elems:
                all_elems += elems
        if all_elems:
            return all_elems

    if main_elem:
        return [Elem(main_elem, num_strokes(root))]

def _merge_elements(elements: list[Elem]) -> list[Elem]:
    new_elements: list[Elem] = []
    for e in elements:
        try:
            ne = next((x for x in new_elements if x.char == e.char), None)
        except TypeError as ex:
            print("Nones", elements)
            raise ex
        if ne:
            ne.strokes += e.strokes
        else:
            new_elements.append(e)
    return new_elements

def get_parts(k: str):
    u = f"{ord(k):05x}"
    xml = kanjivg.read(f"kanji/{u}.svg")
    root: etree._Element = etree.fromstring(xml).xpath(f'//*[@id="kvg:{u}"]')[0]
    elems = _get_elements(root)
    try:
        return _merge_elements(elems)
    except TypeError as ex:
        print("Nones", k)
        raise ex

def get_main_part(k: str, strokes_th=0):
    parts = get_parts(k)

    max_strokes = max(x.strokes for x in parts if not x.is_radical)
    if max_strokes < strokes_th:
        max_strokes = max(x.strokes for x in parts)
        main = next((x for x in parts[::-1] if x.strokes == max_strokes and not x.is_radical), None) if max_strokes >= strokes_th else Elem(k, -1)
    else:
        main = next((x for x in parts[::-1] if x.strokes == max_strokes), None)
    # main = parts[-1]
    return main.char


if __name__ == "__main__":
    k = "凄"
    u = f"{ord(k):05x}"
    print(u)
    print(get_parts(k))
