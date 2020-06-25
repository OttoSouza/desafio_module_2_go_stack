import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CSVTransactions {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionReposiroty = getCustomRepository(TransactionsRepository);
    const categoryReposiroty = getRepository(Category);

    const contactsReadStream = fs.createReadStream(filePath);

    const transactions: CSVTransactions[] = [];
    const categories: string[] = [];
    // ira pegar os valores a partir da linha 2
    const parsers = csvParse({
      from_line: 2,
    });
    // conforme a linha estiver disponivel para leitura, o pipe ira ler
    const parseCSV = contactsReadStream.pipe(parsers);
    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value || !category) return;

      categories.push(category);
      transactions.push({
        title,
        type,
        value,
        category,
      });
    });

    // verificar se o parse emitio um evento END
    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoryReposiroty.find({
      where: {
        title: In(categories),
      },
    });

    // pegar todas as categorias e pegar o title
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitle = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryReposiroty.create(
      addCategoryTitle.map(title => ({
        title,
      })),
    );

    await categoryReposiroty.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionReposiroty.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionReposiroty.save(createdTransactions);
    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
