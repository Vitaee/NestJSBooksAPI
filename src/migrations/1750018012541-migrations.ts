import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1750018012541 implements MigrationInterface {
    name = 'Migrations1750018012541'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "books" (
                "id" SERIAL NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                "title" character varying(255) NOT NULL,
                "author" character varying(255) NOT NULL,
                "description" text,
                "year" integer,
                "coverImageUrl" character varying(500),
                "userId" integer NOT NULL,
                CONSTRAINT "UQ_eaa39a34d811d206617eba205c8" UNIQUE ("userId", "title"),
                CONSTRAINT "PK_f3f2f25a099d24e12545b70b022" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_bb8627d137a861e2d5dc8d1eb2" ON "books" ("userId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_758b39df34dcc7e6769f75926f" ON "books" ("title", "author")
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                "email" character varying(255) NOT NULL,
                "password" character varying(255) NOT NULL,
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email")
        `);
        await queryRunner.query(`
            ALTER TABLE "books"
            ADD CONSTRAINT "FK_bb8627d137a861e2d5dc8d1eb20" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "books" DROP CONSTRAINT "FK_bb8627d137a861e2d5dc8d1eb20"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_758b39df34dcc7e6769f75926f"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_bb8627d137a861e2d5dc8d1eb2"
        `);
        await queryRunner.query(`
            DROP TABLE "books"
        `);
    }

}
