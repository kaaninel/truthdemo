"use strict";
var TruthTalkUI;
(function (TruthTalkUI) {
    class UI {
        constructor() {
            this.Status = document.createElement("div");
            this.Style = document.createElement("style");
            this.Display = document.createElement("pre");
            this.Code = document.createElement("textarea");
            this.Query = document.createElement("textarea");
            this.DataPattern = document.createElement("input");
            this.Timer = null;
            this.Style.innerHTML = UI.Style;
            this.Display.classList.add("display");
            this.Code.classList.add("code");
            this.Query.classList.add("query");
            this.DataPattern.classList.add("pattern");
            this.Status.classList.add("status");
            this.Code.placeholder = "Truth Code";
            this.DataPattern.placeholder = "Data Pattern";
            this.Query.placeholder = "Truth Talk Query";
            this.Code.onkeydown = this.Change.bind(this, true);
            this.DataPattern.onkeydown = this.Change.bind(this, true);
            this.Query.onkeydown = this.Change.bind(this, false);
            this.DataPattern.value = `^\\d{3}-.+`;
            this.Code.value = TruthTalkUI.ScrewHeaders + TruthTalkUI.ScrewSmall;
            this.status();
            this.Eval(true);
        }
        static Init(root) {
            root.classList.add("truthtalkui");
            const instance = new UI();
            //@ts-ignore
            window.instance = instance;
            instance.moveInto(root);
        }
        Change(full) {
            if (this.Timer) {
                clearTimeout(this.Timer);
            }
            this.Timer = setTimeout(async () => {
                this.Eval(full);
            }, 2000);
            this.status("Typing");
        }
        async Eval(full) {
            this.status();
            this.Timer = null;
            if (full)
                await this.Compile();
            this.Execute();
        }
        async Compile() {
            this.status("Compiling");
            const code = this.Code.value;
            const pattern = this.DataPattern.value;
            if (code === "" || pattern === "")
                return;
            return await this.throwable(async () => {
                const result = await Backer.Util.loadFile(code, new RegExp(pattern));
                this.status();
                return result;
            });
        }
        Execute() {
            const query = this.Query.value;
            return this.throwable(() => {
                this.status("Querying");
                const Ast = new Function(...Object.keys(Backer.Schema).map(x => "_" + x.replace(/[^\d\w]/gm, () => "_")), `return tt(${query})`)(...Object.values(Backer.Schema));
                const result = Backer.TruthTalk.Execute(Ast);
                this.Display.innerText = result.map(x => x.toString()).join("\n");
                this.status();
            });
        }
        moveInto(root) {
            root.appendChild(this.Code);
            root.appendChild(this.DataPattern);
            root.appendChild(this.Query);
            root.appendChild(this.Status);
            root.appendChild(this.Display);
            root.appendChild(this.Style);
        }
        status(text = "Ready") {
            this.Status.innerText = text;
        }
        throwable(f) {
            return new Promise(r => {
                setTimeout(() => {
                    try {
                        r(f());
                    }
                    catch (ex) {
                        this.status(`Error: ${ex.toString()}`);
                    }
                }, 0);
            });
        }
    }
    UI.Style = `
			.truthtalkui
			{
				margin: 0;
				padding: 8px;
				width: calc(100vw - 16px);
				height: calc(100vh - 16px);
				left: 0;
				top: 0;
				display: grid;
				grid-template-columns: 1fr 1fr;
				grid-template-rows: 40px 3fr 40px 2fr;
				grid-gap: 8px;
				background: #CCC;
			}
			
			.truthtalkui > * 
			{
				outline: none;
				margin: 0;
				padding: 16px 8px;
				border: none;
				background: #BBB; 
				color: #333; 
				resize: none;
				tab-size: 2;
				overflow: auto;
			}	
			
			.display 
			{
				grid-column: 2;
				grid-row: 2/5;
			}
			.code 
			{
				grid-column: 1;
				grid-row: 1/3;
			}
			.query 
			{
				grid-column: 1;
				grid-row: 4;
			}
			
			.pattern 
			{
				grid-column: 1;
				grid-row: 3;
			}
			
			.status
			{
				grid-column: 2;
				grid-row: 1;
			}
		`;
    TruthTalkUI.UI = UI;
})(TruthTalkUI || (TruthTalkUI = {}));
window.addEventListener('DOMContentLoaded', () => {
    TruthTalkUI.UI.Init(document.body);
});
var TruthTalkUI;
(function (TruthTalkUI) {
    TruthTalkUI.ScrewHeaders = `
// Define Types --------------------------------------------------------------------
Type
Standard, Product, Class, Hole Size, Finish, Grade, Material, Thread Type, Drive Type, Head Style, System of Measurement, SKU : Type

// Unused but may be useful if we want to add any text fields down the road
Number: number
Text: string
/.*/ : Text

Decimal, Fraction : Number
mm, n/mm^2 : Decimal
/\\d+\\.?\\d*/ : mm
/\\d+\\.?\\d*/ : n/mm^2

Range : Class
	Min : Number
	Max : Number
	Nom : Number
		
Metric, Inch : System of Measurement
Metric Hole Size, Inch Hole Size : Hole Size
M1, M1.6, M2, M2.5, M2.6, M3, M3.5, M4, M5, M6, M8, M10 : Metric Hole Size

Stainless Steel, Brass, Low Carbon Steel, Steel, Nylon : Material
Plain, Zinc Chromate Plated, Yellow Zinc Chromate Plated, Natural : Finish
A2, A4, 4.8, 5.8, 6/6 : Grade

304 : A2
316 : A4

Coarse, Fine : Thread Type
Flat : Head Style
Slot : Drive Type


// Define Machine Screw Types ------------------------------------------------------
Machine Screw : Product
	System of Measurement : System of Measurement
	Hole Size : Hole Size
	Head Diameter : Range
	Head Style : Head Style
	Drive Type : Drive Type
	Thread Type : Thread Type
	Thread Pitch : Number
	Material : Material
	Grade : Grade
	Finish : Finish
	Tensile Strength : Number

Metric Machine Screw : Machine Screw
	System of Measurement : Metric
	Hole Size : Metric Hole Size
	Head Height : mm
	Thread Pitch : mm
	Tensile Strength : n/mm^2
	Length : mm


// Define ISO Standards for Dimensions ---------------------------------------------
ISO 2009 : Standard
	Head Style : Flat
	Drive Type : Slot
	Thread Type : Coarse
	Thread Pitch : mm
	Head Height : mm
	Head Diameter : Range
		Min : mm
		Max : mm
		
ISO 2009 M1 : ISO 2009
	Hole Size : M1
	Thread Pitch : 0.25
	Head Height : 0.60
	Head Diameter : Range
		Min : 1.76
		Max : 1.90
		
ISO 2009 M1.6 : ISO 2009
	Hole Size : M1.6
	Thread Pitch : 0.35
	Head Height : 0.96
	Head Diameter : Range
		Min : 2.86
		Max : 3.00

ISO 2009 M2 : ISO 2009
	Hole Size : M2
	Thread Pitch : 0.40
	Head Height : 1.20
	Head Diameter : Range
		Min : 3.50
		Max : 3.80

ISO 2009 M2.5 : ISO 2009
	Hole Size : M2.5
	Thread Pitch : 0.45
	Head Height : 1.50
	Head Diameter : Range
		Min : 4.40
		Max : 4.70
		
ISO 2009 M2.6 : ISO 2009
	Hole Size : M2.6
	Thread Pitch : 0.45
	Head Height : 1.50
	Head Diameter : Range
		Min : 4.70
		Max : 5.00

ISO 2009 M3 : ISO 2009
	Hole Size : M3
	Thread Pitch : 0.50
	Head Height : 1.65
	Head Diameter : Range
		Min : 5.30
		Max : 5.60
		
ISO 2009 M3.5 : ISO 2009
	Hole Size : M3.5
	Thread Pitch : 0.60
	Head Height : 1.93
	Head Diameter : Range
		Min : 6.14
		Max : 6.50

ISO 2009 M4 : ISO 2009
	Hole Size : M4
	Thread Pitch : 0.70
	Head Height : 2.20
	Head Diameter : Range
		Min : 7.14
		Max : 7.50

ISO 2009 M5 : ISO 2009
	Hole Size : M5
	Thread Pitch : 0.80
	Head Height : 2.50
	Head Diameter : Range
		Min : 8.84
		Max : 9.20
		
ISO 2009 M6 : ISO 2009
	Hole Size : M6
	Thread Pitch : 1.00
	Head Height : 3.00 
	Head Diameter : Range
		Min : 10.57
		Max : 11.00

ISO 2009 M8 : ISO 2009
	Hole Size : M8
	Thread Pitch : 1.25
	Head Height : 4.00
	Head Diameter : Range
		Min : 14.07
		Max : 14.50

ISO 2009 M10 : ISO 2009
	Hole Size : M10
	Thread Pitch : 1.50
	Head Height : 5.00
	Head Diameter : Range
		Min : 17.57
		Max : 18.00
	

// Define ISO Standards for Stainless ----------------------------------------------
ISO 3506-1 : Standard
	Tensile Strength : Number
	
ISO 3506-1 A2 : ISO 3506-1
	Material : Stainless Steel
	Grade : A2
	Tensile Strength : 500.00
	
ISO 3506-1 A4 : ISO 3506-1
	Material : Stainless Steel
	Grade : A4
	Tensile Strength : 700.00
	
	
// Define ISO Standards for Brass --------------------------------------------------
ISO 197-1 : Standard
	Tensile Strength : n/mm^2

ISO 197-1 Brass : ISO 197-1
	Material : Brass
	Tensile Strength : 135.00
	
	
// Define ISO Standards for (Low)Carbon Steel --------------------------------------
ISO 898-1 : Standard
	Tensile Strength : Number
	
ISO 898-1 4.8 : ISO 898-1
	Material : Low Carbon Steel
	Grade : 4.8
	Tensile Strength : 420.00
	
ISO 898-1 5.8 : ISO 898-1
	Material : Steel
	Grade : 5.8
	Tensile Strength : 520.00
	
	
// Define ISO Standards for Nylon 6/6 ----------------------------------------------
ISO 16396-1 : Standard
	Tensile Strength : n/mm^2
	
ISO 16396-1 Nylon 6/6 : ISO 16396-1
	Material : Nylon
	Grade : 6/6
	Finish : Natural
	Tensile Stength : 82.5		
	`;
    TruthTalkUI.ScrewSmall = `
421-095 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 16
	Finish : Plain
	
421-096 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 20
	Finish : Plain`;
    TruthTalkUI.ScrewData = `
421-095 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 16
	Finish : Plain

421-096 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 20
	Finish : Plain

421-101 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 8
	Finish : Plain

421-102 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 12
	Finish : Plain

421-103 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 16
	Finish : Plain

421-104 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 20
	Finish : Plain

421-105 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 30
	Finish : Plain

421-106 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 10
	Finish : Plain

421-109 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 25
	Finish : Plain

421-110 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 12
	Finish : Plain

421-111 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 16
	Finish : Plain

421-112 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 20
	Finish : Plain

421-113 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 25
	Finish : Plain

421-114 : SKU, ISO 2009 M8, ISO 3506-1 A2, Metric Machine Screw
	Length : 20
	Finish : Plain

421-115 : SKU, ISO 2009 M8, ISO 3506-1 A2, Metric Machine Screw
	Length : 25
	Finish : Plain

421-116 : SKU, ISO 2009 M8, ISO 3506-1 A2, Metric Machine Screw
	Length : 30
	Finish : Plain

421-117 : SKU, ISO 2009 M10, ISO 3506-1 A2, Metric Machine Screw
	Length : 16
	Finish : Plain

421-118 : SKU, ISO 2009 M10, ISO 3506-1 A2, Metric Machine Screw
	Length : 20
	Finish : Plain

421-119 : SKU, ISO 2009 M10, ISO 3506-1 A2, Metric Machine Screw
	Length : 25
	Finish : Plain

421-120 : SKU, ISO 2009 M10, ISO 3506-1 A2, Metric Machine Screw
	Length : 30
	Finish : Plain

421-135 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 10
	Finish : Plain

421-136 : SKU, ISO 2009 M8, ISO 3506-1 A2, Metric Machine Screw
	Length : 50
	Finish : Plain

421-171 : SKU, ISO 2009 M1.6, ISO 3506-1 A2, Metric Machine Screw
	Length : 5
	Finish : Plain

421-172 : SKU, ISO 2009 M1.6, ISO 3506-1 A2, Metric Machine Screw
	Length : 6
	Finish : Plain

421-173 : SKU, ISO 2009 M2, ISO 3506-1 A2, Metric Machine Screw
	Length : 5
	Finish : Plain

421-174 : SKU, ISO 2009 M2, ISO 3506-1 A2, Metric Machine Screw
	Length : 6
	Finish : Plain

421-175 : SKU, ISO 2009 M2, ISO 3506-1 A2, Metric Machine Screw
	Length : 8
	Finish : Plain

421-176 : SKU, ISO 2009 M2, ISO 3506-1 A2, Metric Machine Screw
	Length : 10
	Finish : Plain

421-177 : SKU, ISO 2009 M2.5, ISO 3506-1 A2, Metric Machine Screw
	Length : 5
	Finish : Plain

421-179 : SKU, ISO 2009 M2.5, ISO 3506-1 A2, Metric Machine Screw
	Length : 12
	Finish : Plain

421-180 : SKU, ISO 2009 M2.5, ISO 3506-1 A2, Metric Machine Screw
	Length : 16
	Finish : Plain

421-182 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 5
	Finish : Plain

421-197 : SKU, ISO 2009 M1.6, ISO 3506-1 A2, Metric Machine Screw
	Length : 4
	Finish : Plain

421-198 : SKU, ISO 2009 M1.6, ISO 3506-1 A2, Metric Machine Screw
	Length : 8
	Finish : Plain

421-199 : SKU, ISO 2009 M1.6, ISO 3506-1 A2, Metric Machine Screw
	Length : 10
	Finish : Plain

421-200 : SKU, ISO 2009 M1.6, ISO 3506-1 A2, Metric Machine Screw
	Length : 12
	Finish : Plain

421-201 : SKU, ISO 2009 M2, ISO 3506-1 A2, Metric Machine Screw
	Length : 20
	Finish : Plain

421-202 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 25
	Finish : Plain

421-203 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 6
	Finish : Plain

421-204 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 6
	Finish : Plain

421-541 : SKU, ISO 2009 M2, ISO 3506-1 A4, Metric Machine Screw
	Length : 4
	Finish : Plain

421-542 : SKU, ISO 2009 M2, ISO 3506-1 A4, Metric Machine Screw
	Length : 5
	Finish : Plain

421-543 : SKU, ISO 2009 M2, ISO 3506-1 A4, Metric Machine Screw
	Length : 6
	Finish : Plain

421-544 : SKU, ISO 2009 M2, ISO 3506-1 A4, Metric Machine Screw
	Length : 8
	Finish : Plain

421-547 : SKU, ISO 2009 M2, ISO 3506-1 A4, Metric Machine Screw
	Length : 16
	Finish : Plain

421-549 : SKU, ISO 2009 M2.5, ISO 3506-1 A4, Metric Machine Screw
	Length : 5
	Finish : Plain

421-551 : SKU, ISO 2009 M2.5, ISO 3506-1 A4, Metric Machine Screw
	Length : 10
	Finish : Plain

421-552 : SKU, ISO 2009 M2.5, ISO 3506-1 A4, Metric Machine Screw
	Length : 16
	Finish : Plain

421-093 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 8
	Finish : Plain

421-108 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 20
	Finish : Plain

421-374 : SKU, ISO 2009 M1.6, ISO 3506-1 A2, Metric Machine Screw
	Length : 3
	Finish : Plain

421-375 : SKU, ISO 2009 M2, ISO 3506-1 A2, Metric Machine Screw
	Length : 3
	Finish : Plain

421-376 : SKU, ISO 2009 M2, ISO 3506-1 A2, Metric Machine Screw
	Length : 4
	Finish : Plain

421-377 : SKU, ISO 2009 M2, ISO 3506-1 A2, Metric Machine Screw
	Length : 12
	Finish : Plain

421-378 : SKU, ISO 2009 M2, ISO 3506-1 A2, Metric Machine Screw
	Length : 16
	Finish : Plain

421-379 : SKU, ISO 2009 M2.5, ISO 3506-1 A2, Metric Machine Screw
	Length : 4
	Finish : Plain

421-380 : SKU, ISO 2009 M2.5, ISO 3506-1 A2, Metric Machine Screw
	Length : 6
	Finish : Plain

421-382 : SKU, ISO 2009 M2.5, ISO 3506-1 A2, Metric Machine Screw
	Length : 25
	Finish : Plain

421-384 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 10
	Finish : Plain

421-385 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 30
	Finish : Plain

421-386 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 35
	Finish : Plain

421-387 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 40
	Finish : Plain

421-389 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 50
	Finish : Plain

421-390 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 10
	Finish : Plain

421-391 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 25
	Finish : Plain

421-392 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 35
	Finish : Plain

421-393 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 40
	Finish : Plain

421-394 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 45
	Finish : Plain

421-395 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 60
	Finish : Plain

421-396 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 8
	Finish : Plain

421-398 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 35
	Finish : Plain

421-399 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 40
	Finish : Plain

421-401 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 50
	Finish : Plain

421-402 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 60
	Finish : Plain

421-403 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 70
	Finish : Plain

421-404 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 80
	Finish : Plain

421-405 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 90
	Finish : Plain

421-406 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 100
	Finish : Plain

421-407 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 8
	Finish : Plain

421-408 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 35
	Finish : Plain

421-409 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 40
	Finish : Plain

421-410 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 45
	Finish : Plain

421-411 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 50
	Finish : Plain

421-413 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 60
	Finish : Plain

421-414 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 70
	Finish : Plain

421-416 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 90
	Finish : Plain

421-417 : SKU, ISO 2009 M6, ISO 3506-1 A2, Metric Machine Screw
	Length : 100
	Finish : Plain

421-418 : SKU, ISO 2009 M8, ISO 3506-1 A2, Metric Machine Screw
	Length : 12
	Finish : Plain

421-419 : SKU, ISO 2009 M8, ISO 3506-1 A2, Metric Machine Screw
	Length : 16
	Finish : Plain

421-422 : SKU, ISO 2009 M8, ISO 3506-1 A2, Metric Machine Screw
	Length : 60
	Finish : Plain

421-423 : SKU, ISO 2009 M8, ISO 3506-1 A2, Metric Machine Screw
	Length : 70
	Finish : Plain

421-424 : SKU, ISO 2009 M8, ISO 3506-1 A2, Metric Machine Screw
	Length : 80
	Finish : Plain

421-426 : SKU, ISO 2009 M8, ISO 3506-1 A2, Metric Machine Screw
	Length : 100
	Finish : Plain

421-427 : SKU, ISO 2009 M10, ISO 3506-1 A2, Metric Machine Screw
	Length : 35
	Finish : Plain

421-430 : SKU, ISO 2009 M10, ISO 3506-1 A2, Metric Machine Screw
	Length : 60
	Finish : Plain

421-432 : SKU, ISO 2009 M10, ISO 3506-1 A2, Metric Machine Screw
	Length : 80
	Finish : Plain

421-434 : SKU, ISO 2009 M10, ISO 3506-1 A2, Metric Machine Screw
	Length : 100
	Finish : Plain

421-436 : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 30
	Finish : Plain

421-437 : SKU, ISO 2009 M4, ISO 3506-1 A2, Metric Machine Screw
	Length : 50
	Finish : Plain

421-569 : SKU, ISO 2009 M3, ISO 3506-1 A4, Metric Machine Screw
	Length : 10
	Finish : Plain

421-579 : SKU, ISO 2009 M4, ISO 3506-1 A4, Metric Machine Screw
	Length : 10
	Finish : Plain

421-580 : SKU, ISO 2009 M4, ISO 3506-1 A4, Metric Machine Screw
	Length : 16
	Finish : Plain

421-581 : SKU, ISO 2009 M3, ISO 3506-1 A4, Metric Machine Screw
	Length : 12
	Finish : Plain

421-368 : SKU, ISO 2009 M3, ISO 3506-1 A2, Metric Machine Screw
	Length : 4
	Finish : Plain

421-A03-1A : SKU, ISO 2009 M5, ISO 3506-1 A2, Metric Machine Screw
	Length : 16
	Finish : Plain

421-A10-1T : SKU, ISO 2009 M2.5, ISO 3506-1 A2, Metric Machine Screw
	Length : 10
	Finish : Plain
`;
})(TruthTalkUI || (TruthTalkUI = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHR1aS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9JbmRleC50cyIsIi4uL3NvdXJjZS9leGFtcGxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsSUFBVSxXQUFXLENBc01wQjtBQXRNRCxXQUFVLFdBQVc7SUFFcEIsTUFBYSxFQUFFO1FBNEVkO1lBUEEsV0FBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkMsVUFBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDeEMsWUFBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEMsU0FBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUMsVUFBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDM0MsZ0JBQVcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBMkI5QyxVQUFLLEdBQWtCLElBQUksQ0FBQztZQXZCM0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztZQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXBDLElBQUksQ0FBQyxJ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Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBdU4zQixDQUFDO0lBRVcsc0JBQVUsR0FBRzs7Ozs7OztnQkFPWCxDQUFDO0lBRUgscUJBQVMsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQXdhekIsQ0FBQztBQUNGLENBQUMsRUE3b0JTLFdBQVcsS0FBWCxXQUFXLFFBNm9CcEIiLCJzb3VyY2VzQ29udGVudCI6WyJcbm5hbWVzcGFjZSBUcnV0aFRhbGtVSSBcbntcblx0ZXhwb3J0IGNsYXNzIFVJIFxuXHR7XG5cdFx0c3RhdGljIEluaXQocm9vdDogSFRNTEVsZW1lbnQpXG5cdFx0e1xuXHRcdFx0cm9vdC5jbGFzc0xpc3QuYWRkKFwidHJ1dGh0YWxrdWlcIik7XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IG5ldyBVSSgpO1xuXHRcdFx0Ly9AdHMtaWdub3JlXG5cdFx0XHR3aW5kb3cuaW5zdGFuY2UgPSBpbnN0YW5jZTtcblx0XHRcdGluc3RhbmNlLm1vdmVJbnRvKHJvb3QpO1xuXHRcdH1cblx0XHRcblx0XHRzdGF0aWMgU3R5bGUgPSBgXG5cdFx0XHQudHJ1dGh0YWxrdWlcblx0XHRcdHtcblx0XHRcdFx0bWFyZ2luOiAwO1xuXHRcdFx0XHRwYWRkaW5nOiA4cHg7XG5cdFx0XHRcdHdpZHRoOiBjYWxjKDEwMHZ3IC0gMTZweCk7XG5cdFx0XHRcdGhlaWdodDogY2FsYygxMDB2aCAtIDE2cHgpO1xuXHRcdFx0XHRsZWZ0OiAwO1xuXHRcdFx0XHR0b3A6IDA7XG5cdFx0XHRcdGRpc3BsYXk6IGdyaWQ7XG5cdFx0XHRcdGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjtcblx0XHRcdFx0Z3JpZC10ZW1wbGF0ZS1yb3dzOiA0MHB4IDNmciA0MHB4IDJmcjtcblx0XHRcdFx0Z3JpZC1nYXA6IDhweDtcblx0XHRcdFx0YmFja2dyb3VuZDogI0NDQztcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0LnRydXRodGFsa3VpID4gKiBcblx0XHRcdHtcblx0XHRcdFx0b3V0bGluZTogbm9uZTtcblx0XHRcdFx0bWFyZ2luOiAwO1xuXHRcdFx0XHRwYWRkaW5nOiAxNnB4IDhweDtcblx0XHRcdFx0Ym9yZGVyOiBub25lO1xuXHRcdFx0XHRiYWNrZ3JvdW5kOiAjQkJCOyBcblx0XHRcdFx0Y29sb3I6ICMzMzM7IFxuXHRcdFx0XHRyZXNpemU6IG5vbmU7XG5cdFx0XHRcdHRhYi1zaXplOiAyO1xuXHRcdFx0XHRvdmVyZmxvdzogYXV0bztcblx0XHRcdH1cdFxuXHRcdFx0XG5cdFx0XHQuZGlzcGxheSBcblx0XHRcdHtcblx0XHRcdFx0Z3JpZC1jb2x1bW46IDI7XG5cdFx0XHRcdGdyaWQtcm93OiAyLzU7XG5cdFx0XHR9XG5cdFx0XHQuY29kZSBcblx0XHRcdHtcblx0XHRcdFx0Z3JpZC1jb2x1bW46IDE7XG5cdFx0XHRcdGdyaWQtcm93OiAxLzM7XG5cdFx0XHR9XG5cdFx0XHQucXVlcnkgXG5cdFx0XHR7XG5cdFx0XHRcdGdyaWQtY29sdW1uOiAxO1xuXHRcdFx0XHRncmlkLXJvdzogNDtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0LnBhdHRlcm4gXG5cdFx0XHR7XG5cdFx0XHRcdGdyaWQtY29sdW1uOiAxO1xuXHRcdFx0XHRncmlkLXJvdzogMztcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0LnN0YXR1c1xuXHRcdFx0e1xuXHRcdFx0XHRncmlkLWNvbHVtbjogMjtcblx0XHRcdFx0Z3JpZC1yb3c6IDE7XG5cdFx0XHR9XG5cdFx0YDtcblx0XHRcblx0XHRTdGF0dXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXHRcdFN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuXHRcdERpc3BsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicHJlXCIpO1xuXHRcdENvZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG5cdFx0UXVlcnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG5cdFx0RGF0YVBhdHRlcm4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IoKVxuXHRcdHtcblx0XHRcdHRoaXMuU3R5bGUuaW5uZXJIVE1MID0gVUkuU3R5bGU7XG5cdFx0XHR0aGlzLkRpc3BsYXkuY2xhc3NMaXN0LmFkZChcImRpc3BsYXlcIik7XG5cdFx0XHR0aGlzLkNvZGUuY2xhc3NMaXN0LmFkZChcImNvZGVcIik7XG5cdFx0XHR0aGlzLlF1ZXJ5LmNsYXNzTGlzdC5hZGQoXCJxdWVyeVwiKTtcblx0XHRcdHRoaXMuRGF0YVBhdHRlcm4uY2xhc3NMaXN0LmFkZChcInBhdHRlcm5cIik7XG5cdFx0XHR0aGlzLlN0YXR1cy5jbGFzc0xpc3QuYWRkKFwic3RhdHVzXCIpO1xuXHRcdFx0XG5cdFx0XHR0aGlzLkNvZGUucGxhY2Vob2xkZXIgPSBcIlRydXRoIENvZGVcIjtcblx0XHRcdHRoaXMuRGF0YVBhdHRlcm4ucGxhY2Vob2xkZXIgPSBcIkRhdGEgUGF0dGVyblwiO1xuXHRcdFx0dGhpcy5RdWVyeS5wbGFjZWhvbGRlciA9IFwiVHJ1dGggVGFsayBRdWVyeVwiO1xuXHRcdFx0XG5cdFx0XHR0aGlzLkNvZGUub25rZXlkb3duID0gdGhpcy5DaGFuZ2UuYmluZCh0aGlzLCB0cnVlKTtcblx0XHRcdHRoaXMuRGF0YVBhdHRlcm4ub25rZXlkb3duID0gdGhpcy5DaGFuZ2UuYmluZCh0aGlzLCB0cnVlKTtcblx0XHRcdHRoaXMuUXVlcnkub25rZXlkb3duID0gdGhpcy5DaGFuZ2UuYmluZCh0aGlzLCBmYWxzZSk7XG5cdFx0XHRcblx0XHRcdHRoaXMuRGF0YVBhdHRlcm4udmFsdWUgPSBgXlxcXFxkezN9LS4rYDtcblx0XHRcdHRoaXMuQ29kZS52YWx1ZSA9IFNjcmV3SGVhZGVycyArIFNjcmV3U21hbGw7XG5cdFx0XHRcblx0XHRcdHRoaXMuc3RhdHVzKCk7XG5cdFx0XHRcblx0XHRcdHRoaXMuRXZhbCh0cnVlKTtcblx0XHR9XG5cdFx0XG5cdFx0VGltZXI6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXHRcdENoYW5nZShmdWxsOiBib29sZWFuKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLlRpbWVyKSBcblx0XHRcdHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMuVGltZXIpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR0aGlzLlRpbWVyID0gPGFueT5zZXRUaW1lb3V0KGFzeW5jICgpID0+IFxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLkV2YWwoZnVsbCk7XG5cdFx0XHR9LCAyMDAwKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5zdGF0dXMoXCJUeXBpbmdcIik7XG5cdFx0fVxuXHRcdFxuXHRcdGFzeW5jIEV2YWwoZnVsbDogYm9vbGVhbilcblx0XHR7XG5cdFx0XHR0aGlzLnN0YXR1cygpO1xuXHRcdFx0dGhpcy5UaW1lciA9IG51bGw7XG5cdFx0XHRcblx0XHRcdGlmIChmdWxsKSBcblx0XHRcdFx0YXdhaXQgdGhpcy5Db21waWxlKCk7XG5cdFx0XHRcblx0XHRcdHRoaXMuRXhlY3V0ZSgpO1xuXHRcdH1cblx0XHRcblx0XHRhc3luYyBDb21waWxlKClcblx0XHR7XG5cdFx0XHR0aGlzLnN0YXR1cyhcIkNvbXBpbGluZ1wiKTtcblx0XHRcdGNvbnN0IGNvZGUgPSB0aGlzLkNvZGUudmFsdWU7XG5cdFx0XHRjb25zdCBwYXR0ZXJuID0gdGhpcy5EYXRhUGF0dGVybi52YWx1ZTtcblx0XHRcdFxuXHRcdFx0aWYgKGNvZGUgPT09IFwiXCIgfHzCoHBhdHRlcm4gPT09IFwiXCIpIFxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLnRocm93YWJsZShhc3luYyAoKSA9PiBcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgQmFja2VyLlV0aWwubG9hZEZpbGUoY29kZSwgbmV3IFJlZ0V4cChwYXR0ZXJuKSk7XG5cdFx0XHRcdHRoaXMuc3RhdHVzKCk7XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9KTtcblxuXHRcdH1cblx0XHRcblx0XHRFeGVjdXRlKClcblx0XHR7XG5cdFx0XHRjb25zdCBxdWVyeSA9IHRoaXMuUXVlcnkudmFsdWU7XG5cdFx0XHRcblx0XHRcdHJldHVybiB0aGlzLnRocm93YWJsZSgoKSA9PiBcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5zdGF0dXMoXCJRdWVyeWluZ1wiKTtcblx0XHRcdFx0Y29uc3QgQXN0ID0gbmV3IEZ1bmN0aW9uKFxuXHRcdFx0XHRcdC4uLk9iamVjdC5rZXlzKEJhY2tlci5TY2hlbWEpLm1hcCh4ID0+IFwiX1wiICsgeC5yZXBsYWNlKC9bXlxcZFxcd10vZ20sICgpID0+IFwiX1wiKSksIFxuXHRcdFx0XHRcdGByZXR1cm4gdHQoJHtxdWVyeX0pYFxuXHRcdFx0XHRcdCkoLi4uT2JqZWN0LnZhbHVlcyhCYWNrZXIuU2NoZW1hKSk7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IEJhY2tlci5UcnV0aFRhbGsuRXhlY3V0ZShBc3QpO1xuXHRcdFx0XHR0aGlzLkRpc3BsYXkuaW5uZXJUZXh0ID0gcmVzdWx0Lm1hcCh4ID0+IHgudG9TdHJpbmcoKSkuam9pbihcIlxcblwiKTtcblx0XHRcdFx0dGhpcy5zdGF0dXMoKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0fVxuXHRcdFxuXHRcdG1vdmVJbnRvKHJvb3Q6IEhUTUxFbGVtZW50KVxuXHRcdHtcblx0XHRcdHJvb3QuYXBwZW5kQ2hpbGQodGhpcy5Db2RlKTtcblx0XHRcdHJvb3QuYXBwZW5kQ2hpbGQodGhpcy5EYXRhUGF0dGVybik7XG5cdFx0XHRyb290LmFwcGVuZENoaWxkKHRoaXMuUXVlcnkpO1xuXHRcdFx0cm9vdC5hcHBlbmRDaGlsZCh0aGlzLlN0YXR1cyk7XG5cdFx0XHRyb290LmFwcGVuZENoaWxkKHRoaXMuRGlzcGxheSk7XG5cdFx0XHRyb290LmFwcGVuZENoaWxkKHRoaXMuU3R5bGUpO1xuXHRcdH1cblx0XHRcblx0XHRzdGF0dXModGV4dDogc3RyaW5nID0gXCJSZWFkeVwiKVxuXHRcdHtcblx0XHRcdHRoaXMuU3RhdHVzLmlubmVyVGV4dCA9IHRleHQ7XG5cdFx0fVxuXHRcdFxuXHRcdHRocm93YWJsZShmOiBGdW5jdGlvbilcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UociA9PiB7XG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRcdHRyeSBcblx0XHRcdFx0XHR7XHRcblx0XHRcdFx0XHRcdHIoZigpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKGV4KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHRoaXMuc3RhdHVzKGBFcnJvcjogJHtleC50b1N0cmluZygpfWApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LCAwKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0fVxufVxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IFxue1xuXHRUcnV0aFRhbGtVSS5VSS5Jbml0KGRvY3VtZW50LmJvZHkpO1xufSk7IiwiXG5uYW1lc3BhY2UgVHJ1dGhUYWxrVUlcbntcblx0ZXhwb3J0IGNvbnN0IFNjcmV3SGVhZGVycyA9IGBcbi8vIERlZmluZSBUeXBlcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVHlwZVxuU3RhbmRhcmQsIFByb2R1Y3QsIENsYXNzLCBIb2xlIFNpemUsIEZpbmlzaCwgR3JhZGUsIE1hdGVyaWFsLCBUaHJlYWQgVHlwZSwgRHJpdmUgVHlwZSwgSGVhZCBTdHlsZSwgU3lzdGVtIG9mIE1lYXN1cmVtZW50LCBTS1UgOiBUeXBlXG5cbi8vIFVudXNlZCBidXQgbWF5IGJlIHVzZWZ1bCBpZiB3ZSB3YW50IHRvIGFkZCBhbnkgdGV4dCBmaWVsZHMgZG93biB0aGUgcm9hZFxuTnVtYmVyOiBudW1iZXJcblRleHQ6IHN0cmluZ1xuLy4qLyA6IFRleHRcblxuRGVjaW1hbCwgRnJhY3Rpb24gOiBOdW1iZXJcbm1tLCBuL21tXjIgOiBEZWNpbWFsXG4vXFxcXGQrXFxcXC4/XFxcXGQqLyA6IG1tXG4vXFxcXGQrXFxcXC4/XFxcXGQqLyA6IG4vbW1eMlxuXG5SYW5nZSA6IENsYXNzXG5cdE1pbiA6IE51bWJlclxuXHRNYXggOiBOdW1iZXJcblx0Tm9tIDogTnVtYmVyXG5cdFx0XG5NZXRyaWMsIEluY2ggOiBTeXN0ZW0gb2YgTWVhc3VyZW1lbnRcbk1ldHJpYyBIb2xlIFNpemUsIEluY2ggSG9sZSBTaXplIDogSG9sZSBTaXplXG5NMSwgTTEuNiwgTTIsIE0yLjUsIE0yLjYsIE0zLCBNMy41LCBNNCwgTTUsIE02LCBNOCwgTTEwIDogTWV0cmljIEhvbGUgU2l6ZVxuXG5TdGFpbmxlc3MgU3RlZWwsIEJyYXNzLCBMb3cgQ2FyYm9uIFN0ZWVsLCBTdGVlbCwgTnlsb24gOiBNYXRlcmlhbFxuUGxhaW4sIFppbmMgQ2hyb21hdGUgUGxhdGVkLCBZZWxsb3cgWmluYyBDaHJvbWF0ZSBQbGF0ZWQsIE5hdHVyYWwgOiBGaW5pc2hcbkEyLCBBNCwgNC44LCA1LjgsIDYvNiA6IEdyYWRlXG5cbjMwNCA6IEEyXG4zMTYgOiBBNFxuXG5Db2Fyc2UsIEZpbmUgOiBUaHJlYWQgVHlwZVxuRmxhdCA6IEhlYWQgU3R5bGVcblNsb3QgOiBEcml2ZSBUeXBlXG5cblxuLy8gRGVmaW5lIE1hY2hpbmUgU2NyZXcgVHlwZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5NYWNoaW5lIFNjcmV3IDogUHJvZHVjdFxuXHRTeXN0ZW0gb2YgTWVhc3VyZW1lbnQgOiBTeXN0ZW0gb2YgTWVhc3VyZW1lbnRcblx0SG9sZSBTaXplIDogSG9sZSBTaXplXG5cdEhlYWQgRGlhbWV0ZXIgOiBSYW5nZVxuXHRIZWFkIFN0eWxlIDogSGVhZCBTdHlsZVxuXHREcml2ZSBUeXBlIDogRHJpdmUgVHlwZVxuXHRUaHJlYWQgVHlwZSA6IFRocmVhZCBUeXBlXG5cdFRocmVhZCBQaXRjaCA6IE51bWJlclxuXHRNYXRlcmlhbCA6IE1hdGVyaWFsXG5cdEdyYWRlIDogR3JhZGVcblx0RmluaXNoIDogRmluaXNoXG5cdFRlbnNpbGUgU3RyZW5ndGggOiBOdW1iZXJcblxuTWV0cmljIE1hY2hpbmUgU2NyZXcgOiBNYWNoaW5lIFNjcmV3XG5cdFN5c3RlbSBvZiBNZWFzdXJlbWVudCA6IE1ldHJpY1xuXHRIb2xlIFNpemUgOiBNZXRyaWMgSG9sZSBTaXplXG5cdEhlYWQgSGVpZ2h0IDogbW1cblx0VGhyZWFkIFBpdGNoIDogbW1cblx0VGVuc2lsZSBTdHJlbmd0aCA6IG4vbW1eMlxuXHRMZW5ndGggOiBtbVxuXG5cbi8vIERlZmluZSBJU08gU3RhbmRhcmRzIGZvciBEaW1lbnNpb25zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuSVNPIDIwMDkgOiBTdGFuZGFyZFxuXHRIZWFkIFN0eWxlIDogRmxhdFxuXHREcml2ZSBUeXBlIDogU2xvdFxuXHRUaHJlYWQgVHlwZSA6IENvYXJzZVxuXHRUaHJlYWQgUGl0Y2ggOiBtbVxuXHRIZWFkIEhlaWdodCA6IG1tXG5cdEhlYWQgRGlhbWV0ZXIgOiBSYW5nZVxuXHRcdE1pbiA6IG1tXG5cdFx0TWF4IDogbW1cblx0XHRcbklTTyAyMDA5IE0xIDogSVNPIDIwMDlcblx0SG9sZSBTaXplIDogTTFcblx0VGhyZWFkIFBpdGNoIDogMC4yNVxuXHRIZWFkIEhlaWdodCA6IDAuNjBcblx0SGVhZCBEaWFtZXRlciA6IFJhbmdlXG5cdFx0TWluIDogMS43NlxuXHRcdE1heCA6IDEuOTBcblx0XHRcbklTTyAyMDA5IE0xLjYgOiBJU08gMjAwOVxuXHRIb2xlIFNpemUgOiBNMS42XG5cdFRocmVhZCBQaXRjaCA6IDAuMzVcblx0SGVhZCBIZWlnaHQgOiAwLjk2XG5cdEhlYWQgRGlhbWV0ZXIgOiBSYW5nZVxuXHRcdE1pbiA6IDIuODZcblx0XHRNYXggOiAzLjAwXG5cbklTTyAyMDA5IE0yIDogSVNPIDIwMDlcblx0SG9sZSBTaXplIDogTTJcblx0VGhyZWFkIFBpdGNoIDogMC40MFxuXHRIZWFkIEhlaWdodCA6IDEuMjBcblx0SGVhZCBEaWFtZXRlciA6IFJhbmdlXG5cdFx0TWluIDogMy41MFxuXHRcdE1heCA6IDMuODBcblxuSVNPIDIwMDkgTTIuNSA6IElTTyAyMDA5XG5cdEhvbGUgU2l6ZSA6IE0yLjVcblx0VGhyZWFkIFBpdGNoIDogMC40NVxuXHRIZWFkIEhlaWdodCA6IDEuNTBcblx0SGVhZCBEaWFtZXRlciA6IFJhbmdlXG5cdFx0TWluIDogNC40MFxuXHRcdE1heCA6IDQuNzBcblx0XHRcbklTTyAyMDA5IE0yLjYgOiBJU08gMjAwOVxuXHRIb2xlIFNpemUgOiBNMi42XG5cdFRocmVhZCBQaXRjaCA6IDAuNDVcblx0SGVhZCBIZWlnaHQgOiAxLjUwXG5cdEhlYWQgRGlhbWV0ZXIgOiBSYW5nZVxuXHRcdE1pbiA6IDQuNzBcblx0XHRNYXggOiA1LjAwXG5cbklTTyAyMDA5IE0zIDogSVNPIDIwMDlcblx0SG9sZSBTaXplIDogTTNcblx0VGhyZWFkIFBpdGNoIDogMC41MFxuXHRIZWFkIEhlaWdodCA6IDEuNjVcblx0SGVhZCBEaWFtZXRlciA6IFJhbmdlXG5cdFx0TWluIDogNS4zMFxuXHRcdE1heCA6IDUuNjBcblx0XHRcbklTTyAyMDA5IE0zLjUgOiBJU08gMjAwOVxuXHRIb2xlIFNpemUgOiBNMy41XG5cdFRocmVhZCBQaXRjaCA6IDAuNjBcblx0SGVhZCBIZWlnaHQgOiAxLjkzXG5cdEhlYWQgRGlhbWV0ZXIgOiBSYW5nZVxuXHRcdE1pbiA6IDYuMTRcblx0XHRNYXggOiA2LjUwXG5cbklTTyAyMDA5IE00IDogSVNPIDIwMDlcblx0SG9sZSBTaXplIDogTTRcblx0VGhyZWFkIFBpdGNoIDogMC43MFxuXHRIZWFkIEhlaWdodCA6IDIuMjBcblx0SGVhZCBEaWFtZXRlciA6IFJhbmdlXG5cdFx0TWluIDogNy4xNFxuXHRcdE1heCA6IDcuNTBcblxuSVNPIDIwMDkgTTUgOiBJU08gMjAwOVxuXHRIb2xlIFNpemUgOiBNNVxuXHRUaHJlYWQgUGl0Y2ggOiAwLjgwXG5cdEhlYWQgSGVpZ2h0IDogMi41MFxuXHRIZWFkIERpYW1ldGVyIDogUmFuZ2Vcblx0XHRNaW4gOiA4Ljg0XG5cdFx0TWF4IDogOS4yMFxuXHRcdFxuSVNPIDIwMDkgTTYgOiBJU08gMjAwOVxuXHRIb2xlIFNpemUgOiBNNlxuXHRUaHJlYWQgUGl0Y2ggOiAxLjAwXG5cdEhlYWQgSGVpZ2h0IDogMy4wMCBcblx0SGVhZCBEaWFtZXRlciA6IFJhbmdlXG5cdFx0TWluIDogMTAuNTdcblx0XHRNYXggOiAxMS4wMFxuXG5JU08gMjAwOSBNOCA6IElTTyAyMDA5XG5cdEhvbGUgU2l6ZSA6IE04XG5cdFRocmVhZCBQaXRjaCA6IDEuMjVcblx0SGVhZCBIZWlnaHQgOiA0LjAwXG5cdEhlYWQgRGlhbWV0ZXIgOiBSYW5nZVxuXHRcdE1pbiA6IDE0LjA3XG5cdFx0TWF4IDogMTQuNTBcblxuSVNPIDIwMDkgTTEwIDogSVNPIDIwMDlcblx0SG9sZSBTaXplIDogTTEwXG5cdFRocmVhZCBQaXRjaCA6IDEuNTBcblx0SGVhZCBIZWlnaHQgOiA1LjAwXG5cdEhlYWQgRGlhbWV0ZXIgOiBSYW5nZVxuXHRcdE1pbiA6IDE3LjU3XG5cdFx0TWF4IDogMTguMDBcblx0XG5cbi8vIERlZmluZSBJU08gU3RhbmRhcmRzIGZvciBTdGFpbmxlc3MgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuSVNPIDM1MDYtMSA6IFN0YW5kYXJkXG5cdFRlbnNpbGUgU3RyZW5ndGggOiBOdW1iZXJcblx0XG5JU08gMzUwNi0xIEEyIDogSVNPIDM1MDYtMVxuXHRNYXRlcmlhbCA6IFN0YWlubGVzcyBTdGVlbFxuXHRHcmFkZSA6IEEyXG5cdFRlbnNpbGUgU3RyZW5ndGggOiA1MDAuMDBcblx0XG5JU08gMzUwNi0xIEE0IDogSVNPIDM1MDYtMVxuXHRNYXRlcmlhbCA6IFN0YWlubGVzcyBTdGVlbFxuXHRHcmFkZSA6IEE0XG5cdFRlbnNpbGUgU3RyZW5ndGggOiA3MDAuMDBcblx0XG5cdFxuLy8gRGVmaW5lIElTTyBTdGFuZGFyZHMgZm9yIEJyYXNzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5JU08gMTk3LTEgOiBTdGFuZGFyZFxuXHRUZW5zaWxlIFN0cmVuZ3RoIDogbi9tbV4yXG5cbklTTyAxOTctMSBCcmFzcyA6IElTTyAxOTctMVxuXHRNYXRlcmlhbCA6IEJyYXNzXG5cdFRlbnNpbGUgU3RyZW5ndGggOiAxMzUuMDBcblx0XG5cdFxuLy8gRGVmaW5lIElTTyBTdGFuZGFyZHMgZm9yIChMb3cpQ2FyYm9uIFN0ZWVsIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5JU08gODk4LTEgOiBTdGFuZGFyZFxuXHRUZW5zaWxlIFN0cmVuZ3RoIDogTnVtYmVyXG5cdFxuSVNPIDg5OC0xIDQuOCA6IElTTyA4OTgtMVxuXHRNYXRlcmlhbCA6IExvdyBDYXJib24gU3RlZWxcblx0R3JhZGUgOiA0Ljhcblx0VGVuc2lsZSBTdHJlbmd0aCA6IDQyMC4wMFxuXHRcbklTTyA4OTgtMSA1LjggOiBJU08gODk4LTFcblx0TWF0ZXJpYWwgOiBTdGVlbFxuXHRHcmFkZSA6IDUuOFxuXHRUZW5zaWxlIFN0cmVuZ3RoIDogNTIwLjAwXG5cdFxuXHRcbi8vIERlZmluZSBJU08gU3RhbmRhcmRzIGZvciBOeWxvbiA2LzYgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuSVNPIDE2Mzk2LTEgOiBTdGFuZGFyZFxuXHRUZW5zaWxlIFN0cmVuZ3RoIDogbi9tbV4yXG5cdFxuSVNPIDE2Mzk2LTEgTnlsb24gNi82IDogSVNPIDE2Mzk2LTFcblx0TWF0ZXJpYWwgOiBOeWxvblxuXHRHcmFkZSA6IDYvNlxuXHRGaW5pc2ggOiBOYXR1cmFsXG5cdFRlbnNpbGUgU3Rlbmd0aCA6IDgyLjVcdFx0XG5cdGA7XG5cdFxuXHRleHBvcnQgY29uc3QgU2NyZXdTbWFsbCA9IGBcbjQyMS0wOTUgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxNlxuXHRGaW5pc2ggOiBQbGFpblxuXHRcbjQyMS0wOTYgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyMFxuXHRGaW5pc2ggOiBQbGFpbmA7XG5cdFxuXHRleHBvcnQgY29uc3QgU2NyZXdEYXRhID0gYFxuNDIxLTA5NSA6IFNLVSwgSVNPIDIwMDkgTTMsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDE2XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0wOTYgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTAxIDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogOFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTAyIDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTJcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTEwMyA6IFNLVSwgSVNPIDIwMDkgTTQsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDE2XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xMDQgOiBTS1UsIElTTyAyMDA5IE00LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTA1IDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMzBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTEwNiA6IFNLVSwgSVNPIDIwMDkgTTUsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDEwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xMDkgOiBTS1UsIElTTyAyMDA5IE01LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTEwIDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTJcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTExMSA6IFNLVSwgSVNPIDIwMDkgTTYsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDE2XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xMTIgOiBTS1UsIElTTyAyMDA5IE02LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTEzIDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMjVcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTExNCA6IFNLVSwgSVNPIDIwMDkgTTgsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDIwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xMTUgOiBTS1UsIElTTyAyMDA5IE04LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTE2IDogU0tVLCBJU08gMjAwOSBNOCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMzBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTExNyA6IFNLVSwgSVNPIDIwMDkgTTEwLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTE4IDogU0tVLCBJU08gMjAwOSBNMTAsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDIwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xMTkgOiBTS1UsIElTTyAyMDA5IE0xMCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMjVcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTEyMCA6IFNLVSwgSVNPIDIwMDkgTTEwLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAzMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTM1IDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTEzNiA6IFNLVSwgSVNPIDIwMDkgTTgsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDUwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xNzEgOiBTS1UsIElTTyAyMDA5IE0xLjYsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDVcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTE3MiA6IFNLVSwgSVNPIDIwMDkgTTEuNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTczIDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTc0IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTc1IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogOFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTc2IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTE3NyA6IFNLVSwgSVNPIDIwMDkgTTIuNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTc5IDogU0tVLCBJU08gMjAwOSBNMi41LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTgwIDogU0tVLCBJU08gMjAwOSBNMi41LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTgyIDogU0tVLCBJU08gMjAwOSBNMywgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTk3IDogU0tVLCBJU08gMjAwOSBNMS42LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA0XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xOTggOiBTS1UsIElTTyAyMDA5IE0xLjYsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDhcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTE5OSA6IFNLVSwgSVNPIDIwMDkgTTEuNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTIwMCA6IFNLVSwgSVNPIDIwMDkgTTEuNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTJcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTIwMSA6IFNLVSwgSVNPIDIwMDkgTTIsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDIwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0yMDIgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMjAzIDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMjA0IDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTQxIDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTQyIDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTQzIDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTQ0IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogOFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTQ3IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTZcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTU0OSA6IFNLVSwgSVNPIDIwMDkgTTIuNSwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTUxIDogU0tVLCBJU08gMjAwOSBNMi41LCBJU08gMzUwNi0xIEE0LCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTUyIDogU0tVLCBJU08gMjAwOSBNMi41LCBJU08gMzUwNi0xIEE0LCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMDkzIDogU0tVLCBJU08gMjAwOSBNMywgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogOFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTA4IDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMjBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM3NCA6IFNLVSwgSVNPIDIwMDkgTTEuNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogM1xuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzc1IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogM1xuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzc2IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzc3IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTJcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM3OCA6IFNLVSwgSVNPIDIwMDkgTTIsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDE2XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zNzkgOiBTS1UsIElTTyAyMDA5IE0yLjUsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDRcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM4MCA6IFNLVSwgSVNPIDIwMDkgTTIuNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzgyIDogU0tVLCBJU08gMjAwOSBNMi41LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzg0IDogU0tVLCBJU08gMjAwOSBNMywgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM4NSA6IFNLVSwgSVNPIDIwMDkgTTMsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDMwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zODYgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAzNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzg3IDogU0tVLCBJU08gMjAwOSBNMywgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNDBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM4OSA6IFNLVSwgSVNPIDIwMDkgTTMsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDUwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zOTAgOiBTS1UsIElTTyAyMDA5IE00LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzkxIDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMjVcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM5MiA6IFNLVSwgSVNPIDIwMDkgTTQsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDM1XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zOTMgOiBTS1UsIElTTyAyMDA5IE00LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA0MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzk0IDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNDVcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM5NSA6IFNLVSwgSVNPIDIwMDkgTTQsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDYwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zOTYgOiBTS1UsIElTTyAyMDA5IE01LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA4XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zOTggOiBTS1UsIElTTyAyMDA5IE01LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAzNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzk5IDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNDBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQwMSA6IFNLVSwgSVNPIDIwMDkgTTUsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDUwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MDIgOiBTS1UsIElTTyAyMDA5IE01LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA2MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDAzIDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNzBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQwNCA6IFNLVSwgSVNPIDIwMDkgTTUsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDgwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MDUgOiBTS1UsIElTTyAyMDA5IE01LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA5MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDA2IDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTAwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MDcgOiBTS1UsIElTTyAyMDA5IE02LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA4XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MDggOiBTS1UsIElTTyAyMDA5IE02LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAzNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDA5IDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNDBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQxMCA6IFNLVSwgSVNPIDIwMDkgTTYsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDQ1XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MTEgOiBTS1UsIElTTyAyMDA5IE02LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA1MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDEzIDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNjBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQxNCA6IFNLVSwgSVNPIDIwMDkgTTYsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDcwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MTYgOiBTS1UsIElTTyAyMDA5IE02LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA5MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDE3IDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTAwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MTggOiBTS1UsIElTTyAyMDA5IE04LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDE5IDogU0tVLCBJU08gMjAwOSBNOCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTZcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQyMiA6IFNLVSwgSVNPIDIwMDkgTTgsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDYwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MjMgOiBTS1UsIElTTyAyMDA5IE04LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA3MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDI0IDogU0tVLCBJU08gMjAwOSBNOCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogODBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQyNiA6IFNLVSwgSVNPIDIwMDkgTTgsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDEwMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDI3IDogU0tVLCBJU08gMjAwOSBNMTAsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDM1XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MzAgOiBTS1UsIElTTyAyMDA5IE0xMCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNjBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQzMiA6IFNLVSwgSVNPIDIwMDkgTTEwLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA4MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDM0IDogU0tVLCBJU08gMjAwOSBNMTAsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDEwMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDM2IDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMzBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQzNyA6IFNLVSwgSVNPIDIwMDkgTTQsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDUwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS01NjkgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEE0LCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTc5IDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTU4MCA6IFNLVSwgSVNPIDIwMDkgTTQsIElTTyAzNTA2LTEgQTQsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDE2XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS01ODEgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEE0LCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzY4IDogU0tVLCBJU08gMjAwOSBNMywgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtQTAzLTFBIDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTZcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLUExMC0xVCA6IFNLVSwgSVNPIDIwMDkgTTIuNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cbmA7XG59Il19