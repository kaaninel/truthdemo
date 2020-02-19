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
                const result = Backer.TruthTalk.execute(Ast);
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

Decimal, Fraction : Number
mm, n/mm^2 : Decimal
/\\d+\\.?\\d*/ : mm
/\\d+\\.?\\d*/ : n/mm^2
		
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
		
ISO 2009 M1 : ISO 2009
	Hole Size : M1
	Thread Pitch : 0.25
	Head Height : 0.60
		
ISO 2009 M1.6 : ISO 2009
	Hole Size : M1.6
	Thread Pitch : 0.35
	Head Height : 0.96

ISO 2009 M2 : ISO 2009
	Hole Size : M2
	Thread Pitch : 0.40
	Head Height : 1.20

ISO 2009 M2.5 : ISO 2009
	Hole Size : M2.5
	Thread Pitch : 0.45
	Head Height : 1.50
		
ISO 2009 M2.6 : ISO 2009
	Hole Size : M2.6
	Thread Pitch : 0.45
	Head Height : 1.50

ISO 2009 M3 : ISO 2009
	Hole Size : M3
	Thread Pitch : 0.50
	Head Height : 1.65
		
ISO 2009 M3.5 : ISO 2009
	Hole Size : M3.5
	Thread Pitch : 0.60
	Head Height : 1.93

ISO 2009 M4 : ISO 2009
	Hole Size : M4
	Thread Pitch : 0.70
	Head Height : 2.20

ISO 2009 M5 : ISO 2009
	Hole Size : M5
	Thread Pitch : 0.80
	Head Height : 2.50
		
ISO 2009 M6 : ISO 2009
	Hole Size : M6
	Thread Pitch : 1.00
	Head Height : 3.00

ISO 2009 M8 : ISO 2009
	Hole Size : M8
	Thread Pitch : 1.25
	Head Height : 4.00

ISO 2009 M10 : ISO 2009
	Hole Size : M10
	Thread Pitch : 1.50
	Head Height : 5.00
	

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
	Tensile Stength : 82.5		`;
    TruthTalkUI.ScrewSmall = `
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
`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHR1aS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9JbmRleC50cyIsIi4uL3NvdXJjZS9leGFtcGxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsSUFBVSxXQUFXLENBc01wQjtBQXRNRCxXQUFVLFdBQVc7SUFFcEIsTUFBYSxFQUFFO1FBNEVkO1lBUEEsV0FBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkMsVUFBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDeEMsWUFBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEMsU0FBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUMsVUFBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDM0MsZ0JBQVcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBMkI5QyxVQUFLLEdBQWtCLElBQUksQ0FBQztZQXZCM0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztZQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXBDLElBQUksQ0FBQyxJ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Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzBCQXVLSCxDQUFDO0lBRWIsc0JBQVUsR0FBRzs7Ozs7Ozs7Ozs7Ozs7OztDQWdCMUIsQ0FBQztJQUVZLHFCQUFTLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0F3YXpCLENBQUM7QUFDRixDQUFDLEVBdG1CUyxXQUFXLEtBQVgsV0FBVyxRQXNtQnBCIiwic291cmNlc0NvbnRlbnQiOlsiXG5uYW1lc3BhY2UgVHJ1dGhUYWxrVUkgXG57XG5cdGV4cG9ydCBjbGFzcyBVSSBcblx0e1xuXHRcdHN0YXRpYyBJbml0KHJvb3Q6IEhUTUxFbGVtZW50KVxuXHRcdHtcblx0XHRcdHJvb3QuY2xhc3NMaXN0LmFkZChcInRydXRodGFsa3VpXCIpO1xuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSBuZXcgVUkoKTtcblx0XHRcdC8vQHRzLWlnbm9yZVxuXHRcdFx0d2luZG93Lmluc3RhbmNlID0gaW5zdGFuY2U7XG5cdFx0XHRpbnN0YW5jZS5tb3ZlSW50byhyb290KTtcblx0XHR9XG5cdFx0XG5cdFx0c3RhdGljIFN0eWxlID0gYFxuXHRcdFx0LnRydXRodGFsa3VpXG5cdFx0XHR7XG5cdFx0XHRcdG1hcmdpbjogMDtcblx0XHRcdFx0cGFkZGluZzogOHB4O1xuXHRcdFx0XHR3aWR0aDogY2FsYygxMDB2dyAtIDE2cHgpO1xuXHRcdFx0XHRoZWlnaHQ6IGNhbGMoMTAwdmggLSAxNnB4KTtcblx0XHRcdFx0bGVmdDogMDtcblx0XHRcdFx0dG9wOiAwO1xuXHRcdFx0XHRkaXNwbGF5OiBncmlkO1xuXHRcdFx0XHRncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmciAxZnI7XG5cdFx0XHRcdGdyaWQtdGVtcGxhdGUtcm93czogNDBweCAzZnIgNDBweCAyZnI7XG5cdFx0XHRcdGdyaWQtZ2FwOiA4cHg7XG5cdFx0XHRcdGJhY2tncm91bmQ6ICNDQ0M7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC50cnV0aHRhbGt1aSA+ICogXG5cdFx0XHR7XG5cdFx0XHRcdG91dGxpbmU6IG5vbmU7XG5cdFx0XHRcdG1hcmdpbjogMDtcblx0XHRcdFx0cGFkZGluZzogMTZweCA4cHg7XG5cdFx0XHRcdGJvcmRlcjogbm9uZTtcblx0XHRcdFx0YmFja2dyb3VuZDogI0JCQjsgXG5cdFx0XHRcdGNvbG9yOiAjMzMzOyBcblx0XHRcdFx0cmVzaXplOiBub25lO1xuXHRcdFx0XHR0YWItc2l6ZTogMjtcblx0XHRcdFx0b3ZlcmZsb3c6IGF1dG87XG5cdFx0XHR9XHRcblx0XHRcdFxuXHRcdFx0LmRpc3BsYXkgXG5cdFx0XHR7XG5cdFx0XHRcdGdyaWQtY29sdW1uOiAyO1xuXHRcdFx0XHRncmlkLXJvdzogMi81O1xuXHRcdFx0fVxuXHRcdFx0LmNvZGUgXG5cdFx0XHR7XG5cdFx0XHRcdGdyaWQtY29sdW1uOiAxO1xuXHRcdFx0XHRncmlkLXJvdzogMS8zO1xuXHRcdFx0fVxuXHRcdFx0LnF1ZXJ5IFxuXHRcdFx0e1xuXHRcdFx0XHRncmlkLWNvbHVtbjogMTtcblx0XHRcdFx0Z3JpZC1yb3c6IDQ7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC5wYXR0ZXJuIFxuXHRcdFx0e1xuXHRcdFx0XHRncmlkLWNvbHVtbjogMTtcblx0XHRcdFx0Z3JpZC1yb3c6IDM7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC5zdGF0dXNcblx0XHRcdHtcblx0XHRcdFx0Z3JpZC1jb2x1bW46IDI7XG5cdFx0XHRcdGdyaWQtcm93OiAxO1xuXHRcdFx0fVxuXHRcdGA7XG5cdFx0XG5cdFx0U3RhdHVzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0XHRTdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcblx0XHREaXNwbGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInByZVwiKTtcblx0XHRDb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuXHRcdFF1ZXJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuXHRcdERhdGFQYXR0ZXJuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKClcblx0XHR7XG5cdFx0XHR0aGlzLlN0eWxlLmlubmVySFRNTCA9IFVJLlN0eWxlO1xuXHRcdFx0dGhpcy5EaXNwbGF5LmNsYXNzTGlzdC5hZGQoXCJkaXNwbGF5XCIpO1xuXHRcdFx0dGhpcy5Db2RlLmNsYXNzTGlzdC5hZGQoXCJjb2RlXCIpO1xuXHRcdFx0dGhpcy5RdWVyeS5jbGFzc0xpc3QuYWRkKFwicXVlcnlcIik7XG5cdFx0XHR0aGlzLkRhdGFQYXR0ZXJuLmNsYXNzTGlzdC5hZGQoXCJwYXR0ZXJuXCIpO1xuXHRcdFx0dGhpcy5TdGF0dXMuY2xhc3NMaXN0LmFkZChcInN0YXR1c1wiKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5Db2RlLnBsYWNlaG9sZGVyID0gXCJUcnV0aCBDb2RlXCI7XG5cdFx0XHR0aGlzLkRhdGFQYXR0ZXJuLnBsYWNlaG9sZGVyID0gXCJEYXRhIFBhdHRlcm5cIjtcblx0XHRcdHRoaXMuUXVlcnkucGxhY2Vob2xkZXIgPSBcIlRydXRoIFRhbGsgUXVlcnlcIjtcblx0XHRcdFxuXHRcdFx0dGhpcy5Db2RlLm9ua2V5ZG93biA9IHRoaXMuQ2hhbmdlLmJpbmQodGhpcywgdHJ1ZSk7XG5cdFx0XHR0aGlzLkRhdGFQYXR0ZXJuLm9ua2V5ZG93biA9IHRoaXMuQ2hhbmdlLmJpbmQodGhpcywgdHJ1ZSk7XG5cdFx0XHR0aGlzLlF1ZXJ5Lm9ua2V5ZG93biA9IHRoaXMuQ2hhbmdlLmJpbmQodGhpcywgZmFsc2UpO1xuXHRcdFx0XG5cdFx0XHR0aGlzLkRhdGFQYXR0ZXJuLnZhbHVlID0gYF5cXFxcZHszfS0uK2A7XG5cdFx0XHR0aGlzLkNvZGUudmFsdWUgPSBTY3Jld0hlYWRlcnMgKyBTY3Jld1NtYWxsO1xuXHRcdFx0XG5cdFx0XHR0aGlzLnN0YXR1cygpO1xuXHRcdFx0XG5cdFx0XHR0aGlzLkV2YWwodHJ1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdFRpbWVyOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblx0XHRDaGFuZ2UoZnVsbDogYm9vbGVhbilcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5UaW1lcikgXG5cdFx0XHR7XG5cdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLlRpbWVyKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dGhpcy5UaW1lciA9IDxhbnk+c2V0VGltZW91dChhc3luYyAoKSA9PiBcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5FdmFsKGZ1bGwpO1xuXHRcdFx0fSwgMjAwMCk7XG5cdFx0XHRcblx0XHRcdHRoaXMuc3RhdHVzKFwiVHlwaW5nXCIpO1xuXHRcdH1cblx0XHRcblx0XHRhc3luYyBFdmFsKGZ1bGw6IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5zdGF0dXMoKTtcblx0XHRcdHRoaXMuVGltZXIgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRpZiAoZnVsbCkgXG5cdFx0XHRcdGF3YWl0IHRoaXMuQ29tcGlsZSgpO1xuXHRcdFx0XG5cdFx0XHR0aGlzLkV4ZWN1dGUoKTtcblx0XHR9XG5cdFx0XG5cdFx0YXN5bmMgQ29tcGlsZSgpXG5cdFx0e1xuXHRcdFx0dGhpcy5zdGF0dXMoXCJDb21waWxpbmdcIik7XG5cdFx0XHRjb25zdCBjb2RlID0gdGhpcy5Db2RlLnZhbHVlO1xuXHRcdFx0Y29uc3QgcGF0dGVybiA9IHRoaXMuRGF0YVBhdHRlcm4udmFsdWU7XG5cdFx0XHRcblx0XHRcdGlmIChjb2RlID09PSBcIlwiIHx8wqBwYXR0ZXJuID09PSBcIlwiKSBcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy50aHJvd2FibGUoYXN5bmMgKCkgPT4gXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IEJhY2tlci5VdGlsLmxvYWRGaWxlKGNvZGUsIG5ldyBSZWdFeHAocGF0dGVybikpO1xuXHRcdFx0XHR0aGlzLnN0YXR1cygpO1xuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0fSk7XG5cblx0XHR9XG5cdFx0XG5cdFx0RXhlY3V0ZSgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcXVlcnkgPSB0aGlzLlF1ZXJ5LnZhbHVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcy50aHJvd2FibGUoKCkgPT4gXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuc3RhdHVzKFwiUXVlcnlpbmdcIik7XG5cdFx0XHRcdGNvbnN0IEFzdCA9IG5ldyBGdW5jdGlvbihcblx0XHRcdFx0XHQuLi5PYmplY3Qua2V5cyhCYWNrZXIuU2NoZW1hKS5tYXAoeCA9PiBcIl9cIiArIHgucmVwbGFjZSgvW15cXGRcXHddL2dtLCAoKSA9PiBcIl9cIikpLCBcblx0XHRcdFx0XHRgcmV0dXJuIHR0KCR7cXVlcnl9KWBcblx0XHRcdFx0XHQpKC4uLk9iamVjdC52YWx1ZXMoQmFja2VyLlNjaGVtYSkpO1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBCYWNrZXIuVHJ1dGhUYWxrLmV4ZWN1dGUoQXN0KTtcblx0XHRcdFx0dGhpcy5EaXNwbGF5LmlubmVyVGV4dCA9IHJlc3VsdC5tYXAoeCA9PiB4LnRvU3RyaW5nKCkpLmpvaW4oXCJcXG5cIik7XG5cdFx0XHRcdHRoaXMuc3RhdHVzKCk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdH1cblx0XHRcblx0XHRtb3ZlSW50byhyb290OiBIVE1MRWxlbWVudClcblx0XHR7XG5cdFx0XHRyb290LmFwcGVuZENoaWxkKHRoaXMuQ29kZSk7XG5cdFx0XHRyb290LmFwcGVuZENoaWxkKHRoaXMuRGF0YVBhdHRlcm4pO1xuXHRcdFx0cm9vdC5hcHBlbmRDaGlsZCh0aGlzLlF1ZXJ5KTtcblx0XHRcdHJvb3QuYXBwZW5kQ2hpbGQodGhpcy5TdGF0dXMpO1xuXHRcdFx0cm9vdC5hcHBlbmRDaGlsZCh0aGlzLkRpc3BsYXkpO1xuXHRcdFx0cm9vdC5hcHBlbmRDaGlsZCh0aGlzLlN0eWxlKTtcblx0XHR9XG5cdFx0XG5cdFx0c3RhdHVzKHRleHQ6IHN0cmluZyA9IFwiUmVhZHlcIilcblx0XHR7XG5cdFx0XHR0aGlzLlN0YXR1cy5pbm5lclRleHQgPSB0ZXh0O1xuXHRcdH1cblx0XHRcblx0XHR0aHJvd2FibGUoZjogRnVuY3Rpb24pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKHIgPT4ge1xuXHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0XHR0cnkgXG5cdFx0XHRcdFx0e1x0XG5cdFx0XHRcdFx0XHRyKGYoKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoIChleClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR0aGlzLnN0YXR1cyhgRXJyb3I6ICR7ZXgudG9TdHJpbmcoKX1gKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSwgMCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdH1cbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiBcbntcblx0VHJ1dGhUYWxrVUkuVUkuSW5pdChkb2N1bWVudC5ib2R5KTtcbn0pOyIsIlxubmFtZXNwYWNlIFRydXRoVGFsa1VJXG57XG5cdGV4cG9ydCBjb25zdCBTY3Jld0hlYWRlcnMgPSBgXG4vLyBEZWZpbmUgVHlwZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblR5cGVcblN0YW5kYXJkLCBQcm9kdWN0LCBDbGFzcywgSG9sZSBTaXplLCBGaW5pc2gsIEdyYWRlLCBNYXRlcmlhbCwgVGhyZWFkIFR5cGUsIERyaXZlIFR5cGUsIEhlYWQgU3R5bGUsIFN5c3RlbSBvZiBNZWFzdXJlbWVudCwgU0tVIDogVHlwZVxuXG4vLyBVbnVzZWQgYnV0IG1heSBiZSB1c2VmdWwgaWYgd2Ugd2FudCB0byBhZGQgYW55IHRleHQgZmllbGRzIGRvd24gdGhlIHJvYWRcbk51bWJlcjogbnVtYmVyXG5cbkRlY2ltYWwsIEZyYWN0aW9uIDogTnVtYmVyXG5tbSwgbi9tbV4yIDogRGVjaW1hbFxuL1xcXFxkK1xcXFwuP1xcXFxkKi8gOiBtbVxuL1xcXFxkK1xcXFwuP1xcXFxkKi8gOiBuL21tXjJcblx0XHRcbk1ldHJpYywgSW5jaCA6IFN5c3RlbSBvZiBNZWFzdXJlbWVudFxuTWV0cmljIEhvbGUgU2l6ZSwgSW5jaCBIb2xlIFNpemUgOiBIb2xlIFNpemVcbk0xLCBNMS42LCBNMiwgTTIuNSwgTTIuNiwgTTMsIE0zLjUsIE00LCBNNSwgTTYsIE04LCBNMTAgOiBNZXRyaWMgSG9sZSBTaXplXG5cblN0YWlubGVzcyBTdGVlbCwgQnJhc3MsIExvdyBDYXJib24gU3RlZWwsIFN0ZWVsLCBOeWxvbiA6IE1hdGVyaWFsXG5QbGFpbiwgWmluYyBDaHJvbWF0ZSBQbGF0ZWQsIFllbGxvdyBaaW5jIENocm9tYXRlIFBsYXRlZCwgTmF0dXJhbCA6IEZpbmlzaFxuQTIsIEE0LCA0LjgsIDUuOCwgNi82IDogR3JhZGVcblxuMzA0IDogQTJcbjMxNiA6IEE0XG5cbkNvYXJzZSwgRmluZSA6IFRocmVhZCBUeXBlXG5GbGF0IDogSGVhZCBTdHlsZVxuU2xvdCA6IERyaXZlIFR5cGVcblxuXG4vLyBEZWZpbmUgTWFjaGluZSBTY3JldyBUeXBlcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbk1hY2hpbmUgU2NyZXcgOiBQcm9kdWN0XG5cdFN5c3RlbSBvZiBNZWFzdXJlbWVudCA6IFN5c3RlbSBvZiBNZWFzdXJlbWVudFxuXHRIb2xlIFNpemUgOiBIb2xlIFNpemVcblx0SGVhZCBTdHlsZSA6IEhlYWQgU3R5bGVcblx0RHJpdmUgVHlwZSA6IERyaXZlIFR5cGVcblx0VGhyZWFkIFR5cGUgOiBUaHJlYWQgVHlwZVxuXHRUaHJlYWQgUGl0Y2ggOiBOdW1iZXJcblx0TWF0ZXJpYWwgOiBNYXRlcmlhbFxuXHRHcmFkZSA6IEdyYWRlXG5cdEZpbmlzaCA6IEZpbmlzaFxuXHRUZW5zaWxlIFN0cmVuZ3RoIDogTnVtYmVyXG5cbk1ldHJpYyBNYWNoaW5lIFNjcmV3IDogTWFjaGluZSBTY3Jld1xuXHRTeXN0ZW0gb2YgTWVhc3VyZW1lbnQgOiBNZXRyaWNcblx0SG9sZSBTaXplIDogTWV0cmljIEhvbGUgU2l6ZVxuXHRIZWFkIEhlaWdodCA6IG1tXG5cdFRocmVhZCBQaXRjaCA6IG1tXG5cdFRlbnNpbGUgU3RyZW5ndGggOiBuL21tXjJcblx0TGVuZ3RoIDogbW1cblxuXG4vLyBEZWZpbmUgSVNPIFN0YW5kYXJkcyBmb3IgRGltZW5zaW9ucyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbklTTyAyMDA5IDogU3RhbmRhcmRcblx0SGVhZCBTdHlsZSA6IEZsYXRcblx0RHJpdmUgVHlwZSA6IFNsb3Rcblx0VGhyZWFkIFR5cGUgOiBDb2Fyc2Vcblx0VGhyZWFkIFBpdGNoIDogbW1cblx0SGVhZCBIZWlnaHQgOiBtbVxuXHRcdFxuSVNPIDIwMDkgTTEgOiBJU08gMjAwOVxuXHRIb2xlIFNpemUgOiBNMVxuXHRUaHJlYWQgUGl0Y2ggOiAwLjI1XG5cdEhlYWQgSGVpZ2h0IDogMC42MFxuXHRcdFxuSVNPIDIwMDkgTTEuNiA6IElTTyAyMDA5XG5cdEhvbGUgU2l6ZSA6IE0xLjZcblx0VGhyZWFkIFBpdGNoIDogMC4zNVxuXHRIZWFkIEhlaWdodCA6IDAuOTZcblxuSVNPIDIwMDkgTTIgOiBJU08gMjAwOVxuXHRIb2xlIFNpemUgOiBNMlxuXHRUaHJlYWQgUGl0Y2ggOiAwLjQwXG5cdEhlYWQgSGVpZ2h0IDogMS4yMFxuXG5JU08gMjAwOSBNMi41IDogSVNPIDIwMDlcblx0SG9sZSBTaXplIDogTTIuNVxuXHRUaHJlYWQgUGl0Y2ggOiAwLjQ1XG5cdEhlYWQgSGVpZ2h0IDogMS41MFxuXHRcdFxuSVNPIDIwMDkgTTIuNiA6IElTTyAyMDA5XG5cdEhvbGUgU2l6ZSA6IE0yLjZcblx0VGhyZWFkIFBpdGNoIDogMC40NVxuXHRIZWFkIEhlaWdodCA6IDEuNTBcblxuSVNPIDIwMDkgTTMgOiBJU08gMjAwOVxuXHRIb2xlIFNpemUgOiBNM1xuXHRUaHJlYWQgUGl0Y2ggOiAwLjUwXG5cdEhlYWQgSGVpZ2h0IDogMS42NVxuXHRcdFxuSVNPIDIwMDkgTTMuNSA6IElTTyAyMDA5XG5cdEhvbGUgU2l6ZSA6IE0zLjVcblx0VGhyZWFkIFBpdGNoIDogMC42MFxuXHRIZWFkIEhlaWdodCA6IDEuOTNcblxuSVNPIDIwMDkgTTQgOiBJU08gMjAwOVxuXHRIb2xlIFNpemUgOiBNNFxuXHRUaHJlYWQgUGl0Y2ggOiAwLjcwXG5cdEhlYWQgSGVpZ2h0IDogMi4yMFxuXG5JU08gMjAwOSBNNSA6IElTTyAyMDA5XG5cdEhvbGUgU2l6ZSA6IE01XG5cdFRocmVhZCBQaXRjaCA6IDAuODBcblx0SGVhZCBIZWlnaHQgOiAyLjUwXG5cdFx0XG5JU08gMjAwOSBNNiA6IElTTyAyMDA5XG5cdEhvbGUgU2l6ZSA6IE02XG5cdFRocmVhZCBQaXRjaCA6IDEuMDBcblx0SGVhZCBIZWlnaHQgOiAzLjAwXG5cbklTTyAyMDA5IE04IDogSVNPIDIwMDlcblx0SG9sZSBTaXplIDogTThcblx0VGhyZWFkIFBpdGNoIDogMS4yNVxuXHRIZWFkIEhlaWdodCA6IDQuMDBcblxuSVNPIDIwMDkgTTEwIDogSVNPIDIwMDlcblx0SG9sZSBTaXplIDogTTEwXG5cdFRocmVhZCBQaXRjaCA6IDEuNTBcblx0SGVhZCBIZWlnaHQgOiA1LjAwXG5cdFxuXG4vLyBEZWZpbmUgSVNPIFN0YW5kYXJkcyBmb3IgU3RhaW5sZXNzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbklTTyAzNTA2LTEgOiBTdGFuZGFyZFxuXHRUZW5zaWxlIFN0cmVuZ3RoIDogTnVtYmVyXG5cdFxuSVNPIDM1MDYtMSBBMiA6IElTTyAzNTA2LTFcblx0TWF0ZXJpYWwgOiBTdGFpbmxlc3MgU3RlZWxcblx0R3JhZGUgOiBBMlxuXHRUZW5zaWxlIFN0cmVuZ3RoIDogNTAwLjAwXG5cdFxuSVNPIDM1MDYtMSBBNCA6IElTTyAzNTA2LTFcblx0TWF0ZXJpYWwgOiBTdGFpbmxlc3MgU3RlZWxcblx0R3JhZGUgOiBBNFxuXHRUZW5zaWxlIFN0cmVuZ3RoIDogNzAwLjAwXG5cdFxuXHRcbi8vIERlZmluZSBJU08gU3RhbmRhcmRzIGZvciBCcmFzcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuSVNPIDE5Ny0xIDogU3RhbmRhcmRcblx0VGVuc2lsZSBTdHJlbmd0aCA6IG4vbW1eMlxuXG5JU08gMTk3LTEgQnJhc3MgOiBJU08gMTk3LTFcblx0TWF0ZXJpYWwgOiBCcmFzc1xuXHRUZW5zaWxlIFN0cmVuZ3RoIDogMTM1LjAwXG5cdFxuXHRcbi8vIERlZmluZSBJU08gU3RhbmRhcmRzIGZvciAoTG93KUNhcmJvbiBTdGVlbCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuSVNPIDg5OC0xIDogU3RhbmRhcmRcblx0VGVuc2lsZSBTdHJlbmd0aCA6IE51bWJlclxuXHRcbklTTyA4OTgtMSA0LjggOiBJU08gODk4LTFcblx0TWF0ZXJpYWwgOiBMb3cgQ2FyYm9uIFN0ZWVsXG5cdEdyYWRlIDogNC44XG5cdFRlbnNpbGUgU3RyZW5ndGggOiA0MjAuMDBcblx0XG5JU08gODk4LTEgNS44IDogSVNPIDg5OC0xXG5cdE1hdGVyaWFsIDogU3RlZWxcblx0R3JhZGUgOiA1Ljhcblx0VGVuc2lsZSBTdHJlbmd0aCA6IDUyMC4wMFxuXHRcblx0XG4vLyBEZWZpbmUgSVNPIFN0YW5kYXJkcyBmb3IgTnlsb24gNi82IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbklTTyAxNjM5Ni0xIDogU3RhbmRhcmRcblx0VGVuc2lsZSBTdHJlbmd0aCA6IG4vbW1eMlxuXHRcbklTTyAxNjM5Ni0xIE55bG9uIDYvNiA6IElTTyAxNjM5Ni0xXG5cdE1hdGVyaWFsIDogTnlsb25cblx0R3JhZGUgOiA2LzZcblx0RmluaXNoIDogTmF0dXJhbFxuXHRUZW5zaWxlIFN0ZW5ndGggOiA4Mi41XHRcdGA7XG5cdFxuXHRleHBvcnQgY29uc3QgU2NyZXdTbWFsbCA9IGBcbjQyMS0wOTUgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxNlxuXHRGaW5pc2ggOiBQbGFpblxuXHRcbjQyMS0wOTYgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTAxIDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogOFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTAyIDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTJcblx0RmluaXNoIDogUGxhaW5cbmA7XG5cdFxuXHRleHBvcnQgY29uc3QgU2NyZXdEYXRhID0gYFxuNDIxLTA5NSA6IFNLVSwgSVNPIDIwMDkgTTMsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDE2XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0wOTYgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTAxIDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogOFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTAyIDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTJcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTEwMyA6IFNLVSwgSVNPIDIwMDkgTTQsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDE2XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xMDQgOiBTS1UsIElTTyAyMDA5IE00LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTA1IDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMzBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTEwNiA6IFNLVSwgSVNPIDIwMDkgTTUsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDEwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xMDkgOiBTS1UsIElTTyAyMDA5IE01LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTEwIDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTJcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTExMSA6IFNLVSwgSVNPIDIwMDkgTTYsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDE2XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xMTIgOiBTS1UsIElTTyAyMDA5IE02LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTEzIDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMjVcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTExNCA6IFNLVSwgSVNPIDIwMDkgTTgsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDIwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xMTUgOiBTS1UsIElTTyAyMDA5IE04LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTE2IDogU0tVLCBJU08gMjAwOSBNOCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMzBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTExNyA6IFNLVSwgSVNPIDIwMDkgTTEwLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTE4IDogU0tVLCBJU08gMjAwOSBNMTAsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDIwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xMTkgOiBTS1UsIElTTyAyMDA5IE0xMCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMjVcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTEyMCA6IFNLVSwgSVNPIDIwMDkgTTEwLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAzMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTM1IDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTEzNiA6IFNLVSwgSVNPIDIwMDkgTTgsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDUwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xNzEgOiBTS1UsIElTTyAyMDA5IE0xLjYsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDVcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTE3MiA6IFNLVSwgSVNPIDIwMDkgTTEuNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTczIDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTc0IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTc1IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogOFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTc2IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTE3NyA6IFNLVSwgSVNPIDIwMDkgTTIuNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTc5IDogU0tVLCBJU08gMjAwOSBNMi41LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTgwIDogU0tVLCBJU08gMjAwOSBNMi41LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTgyIDogU0tVLCBJU08gMjAwOSBNMywgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTk3IDogU0tVLCBJU08gMjAwOSBNMS42LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA0XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0xOTggOiBTS1UsIElTTyAyMDA5IE0xLjYsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDhcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTE5OSA6IFNLVSwgSVNPIDIwMDkgTTEuNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTIwMCA6IFNLVSwgSVNPIDIwMDkgTTEuNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTJcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTIwMSA6IFNLVSwgSVNPIDIwMDkgTTIsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDIwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0yMDIgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMjAzIDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMjA0IDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTQxIDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTQyIDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTQzIDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTQ0IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogOFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTQ3IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTZcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTU0OSA6IFNLVSwgSVNPIDIwMDkgTTIuNSwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTUxIDogU0tVLCBJU08gMjAwOSBNMi41LCBJU08gMzUwNi0xIEE0LCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTUyIDogU0tVLCBJU08gMjAwOSBNMi41LCBJU08gMzUwNi0xIEE0LCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMDkzIDogU0tVLCBJU08gMjAwOSBNMywgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogOFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMTA4IDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMjBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM3NCA6IFNLVSwgSVNPIDIwMDkgTTEuNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogM1xuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzc1IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogM1xuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzc2IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzc3IDogU0tVLCBJU08gMjAwOSBNMiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTJcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM3OCA6IFNLVSwgSVNPIDIwMDkgTTIsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDE2XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zNzkgOiBTS1UsIElTTyAyMDA5IE0yLjUsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDRcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM4MCA6IFNLVSwgSVNPIDIwMDkgTTIuNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzgyIDogU0tVLCBJU08gMjAwOSBNMi41LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAyNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzg0IDogU0tVLCBJU08gMjAwOSBNMywgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM4NSA6IFNLVSwgSVNPIDIwMDkgTTMsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDMwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zODYgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAzNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzg3IDogU0tVLCBJU08gMjAwOSBNMywgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNDBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM4OSA6IFNLVSwgSVNPIDIwMDkgTTMsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDUwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zOTAgOiBTS1UsIElTTyAyMDA5IE00LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzkxIDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMjVcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM5MiA6IFNLVSwgSVNPIDIwMDkgTTQsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDM1XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zOTMgOiBTS1UsIElTTyAyMDA5IE00LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA0MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzk0IDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNDVcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTM5NSA6IFNLVSwgSVNPIDIwMDkgTTQsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDYwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zOTYgOiBTS1UsIElTTyAyMDA5IE01LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA4XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS0zOTggOiBTS1UsIElTTyAyMDA5IE01LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAzNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzk5IDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNDBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQwMSA6IFNLVSwgSVNPIDIwMDkgTTUsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDUwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MDIgOiBTS1UsIElTTyAyMDA5IE01LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA2MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDAzIDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNzBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQwNCA6IFNLVSwgSVNPIDIwMDkgTTUsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDgwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MDUgOiBTS1UsIElTTyAyMDA5IE01LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA5MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDA2IDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTAwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MDcgOiBTS1UsIElTTyAyMDA5IE02LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA4XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MDggOiBTS1UsIElTTyAyMDA5IE02LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAzNVxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDA5IDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNDBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQxMCA6IFNLVSwgSVNPIDIwMDkgTTYsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDQ1XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MTEgOiBTS1UsIElTTyAyMDA5IE02LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA1MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDEzIDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNjBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQxNCA6IFNLVSwgSVNPIDIwMDkgTTYsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDcwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MTYgOiBTS1UsIElTTyAyMDA5IE02LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA5MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDE3IDogU0tVLCBJU08gMjAwOSBNNiwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTAwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MTggOiBTS1UsIElTTyAyMDA5IE04LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDE5IDogU0tVLCBJU08gMjAwOSBNOCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTZcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQyMiA6IFNLVSwgSVNPIDIwMDkgTTgsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDYwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MjMgOiBTS1UsIElTTyAyMDA5IE04LCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA3MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDI0IDogU0tVLCBJU08gMjAwOSBNOCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogODBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQyNiA6IFNLVSwgSVNPIDIwMDkgTTgsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDEwMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDI3IDogU0tVLCBJU08gMjAwOSBNMTAsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDM1XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS00MzAgOiBTS1UsIElTTyAyMDA5IE0xMCwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNjBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQzMiA6IFNLVSwgSVNPIDIwMDkgTTEwLCBJU08gMzUwNi0xIEEyLCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiA4MFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDM0IDogU0tVLCBJU08gMjAwOSBNMTAsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDEwMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNDM2IDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMzBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTQzNyA6IFNLVSwgSVNPIDIwMDkgTTQsIElTTyAzNTA2LTEgQTIsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDUwXG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS01NjkgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEE0LCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtNTc5IDogU0tVLCBJU08gMjAwOSBNNCwgSVNPIDM1MDYtMSBBNCwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLTU4MCA6IFNLVSwgSVNPIDIwMDkgTTQsIElTTyAzNTA2LTEgQTQsIE1ldHJpYyBNYWNoaW5lIFNjcmV3XG5cdExlbmd0aCA6IDE2XG5cdEZpbmlzaCA6IFBsYWluXG5cbjQyMS01ODEgOiBTS1UsIElTTyAyMDA5IE0zLCBJU08gMzUwNi0xIEE0LCBNZXRyaWMgTWFjaGluZSBTY3Jld1xuXHRMZW5ndGggOiAxMlxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtMzY4IDogU0tVLCBJU08gMjAwOSBNMywgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogNFxuXHRGaW5pc2ggOiBQbGFpblxuXG40MjEtQTAzLTFBIDogU0tVLCBJU08gMjAwOSBNNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTZcblx0RmluaXNoIDogUGxhaW5cblxuNDIxLUExMC0xVCA6IFNLVSwgSVNPIDIwMDkgTTIuNSwgSVNPIDM1MDYtMSBBMiwgTWV0cmljIE1hY2hpbmUgU2NyZXdcblx0TGVuZ3RoIDogMTBcblx0RmluaXNoIDogUGxhaW5cbmA7XG59Il19